/**
 * Database schema — Sohum Systems recruitment platform.
 *
 * Design notes:
 *  - Resume binaries live in object storage, never in Postgres. `resume_files`
 *    holds only metadata plus the storage path.
 *  - Jobs are archived rather than deleted once applications exist, so the
 *    historical record survives. `applications.job_id` is therefore RESTRICT.
 *  - Enums are Postgres enums so invalid states cannot be written at all.
 */
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const adminRoleEnum = pgEnum("admin_role", ["ADMIN", "RECRUITER", "SUPER_ADMIN", "RECRUITING_ADMIN", "HIRING_MANAGER"]);

export const jobStatusEnum = pgEnum("job_status", ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "CLOSED", "ARCHIVED"]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
]);

export const remoteTypeEnum = pgEnum("remote_type", ["ON_SITE", "HYBRID", "REMOTE"]);

export const experienceLevelEnum = pgEnum("experience_level", [
  "ENTRY",
  "MID",
  "SENIOR",
  "LEAD",
  "PRINCIPAL",
]);

export const employmentStatusEnum = pgEnum("employment_status", [
  "ACTIVE",
  "ON_LEAVE",
  "TERMINATED",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "NEW",
  "SCREENING",
  "OFFER",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
  "HIRED",
]);

/* ----------------------------------------------------------------- admins */

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRoleEnum("role").notNull().default("ADMIN"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admins_email_lower_idx").on(sql`lower(${t.email})`)],
);

/* ------------------------------------------------------------------- jobs */

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    department: varchar("department", { length: 120 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull().default("FULL_TIME"),
    remoteType: remoteTypeEnum("remote_type").notNull().default("ON_SITE"),
    experienceLevel: experienceLevelEnum("experience_level").notNull().default("MID"),

    /** Short summary used on cards and meta descriptions. */
    summary: varchar("summary", { length: 400 }),
    description: text("description").notNull(),
    /** Stored as string arrays so the admin form can edit them as lists. */
    responsibilities: jsonb("responsibilities").$type<string[]>().notNull().default([]),
    qualifications: jsonb("qualifications").$type<string[]>().notNull().default([]),
    preferredQualifications: jsonb("preferred_qualifications").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    salaryRange: varchar("salary_range", { length: 160 }),

    status: jobStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("jobs_slug_idx").on(t.slug),
    index("jobs_status_idx").on(t.status),
    index("jobs_published_at_idx").on(t.publishedAt),
  ],
);

/* -------------------------------------------------------------- employees */

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing identifier, e.g. SOH-EMP-0042. Generated from `sequence`. */
    employeeId: varchar("employee_id", { length: 32 }).notNull(),
    /** Monotonic counter behind employeeId; assigned by Postgres. */
    sequence: bigserial("sequence", { mode: "number" }).notNull(),

    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    workEmail: varchar("work_email", { length: 255 }).notNull(),
    personalEmail: varchar("personal_email", { length: 255 }),
    phone: varchar("phone", { length: 40 }),

    jobTitle: varchar("job_title", { length: 160 }).notNull(),
    department: varchar("department", { length: 120 }).notNull(),
    location: varchar("location", { length: 160 }),
    employmentType: employmentTypeEnum("employment_type").notNull().default("FULL_TIME"),
    status: employmentStatusEnum("status").notNull().default("ACTIVE"),

    managerId: uuid("manager_id"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),

    /** Set when the employee was hired through an application. */
    sourceApplicationId: uuid("source_application_id").references((): AnyPgColumn => applications.id, { onDelete: "restrict" }),

    notes: text("notes"),
    createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("employees_source_application_idx").on(t.sourceApplicationId),
    uniqueIndex("employees_employee_id_idx").on(t.employeeId),
    uniqueIndex("employees_work_email_lower_idx").on(sql`lower(${t.workEmail})`),
    index("employees_status_idx").on(t.status),
    index("employees_department_idx").on(t.department),
  ],
);

/* ----------------------------------------------------------- applications */

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing reference, e.g. SOH-APP-2026-000123. */
    reference: varchar("reference", { length: 32 }).notNull(),
    /** Monotonic counter behind the reference. */
    sequence: bigserial("sequence", { mode: "number" }).notNull(),

    // RESTRICT: a job with applications must be archived, never deleted.
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),

    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }),

    address: varchar("address", { length: 255 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 120 }),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 120 }),

    linkedinUrl: varchar("linkedin_url", { length: 500 }),
    portfolioUrl: varchar("portfolio_url", { length: 500 }),
    yearsExperience: integer("years_experience"),
    coverLetter: text("cover_letter"),

    workAuthorized: boolean("work_authorized"),
    sponsorshipRequired: boolean("sponsorship_required"),

    status: applicationStatusEnum("status").notNull().default("NEW"),
    source: varchar("source", { length: 160 }),
    internalNotes: text("internal_notes"),
    skills: text("skills").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    assignedTo: uuid("assigned_to").references(() => admins.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("applications_reference_idx").on(t.reference),
    index("applications_assigned_idx").on(t.assignedTo),
    index("applications_source_idx").on(t.source),
    index("applications_job_idx").on(t.jobId),
    index("applications_status_idx").on(t.status),
    index("applications_created_idx").on(t.createdAt),
    index("applications_email_idx").on(sql`lower(${t.email})`),
  ],
);

/* ---------------------------------------------------------- resume files */

export const resumeFiles = pgTable(
  "resume_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    originalFilename: varchar("original_filename", { length: 300 }).notNull(),
    /** Path inside the private bucket. Never sent to the browser. */
    storagePath: text("storage_path").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resume_files_application_idx").on(t.applicationId)],
);

/* ------------------------------------------------ application status log */

export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatusEnum("from_status"),
    toStatus: applicationStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => admins.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("application_events_application_idx").on(t.applicationId)],
);

/* ------------------------------------------------------------ audit log */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 80 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_admin_idx").on(t.adminId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------- relations */

export const jobsRelations = relations(jobs, ({ many, one }) => ({
  applications: many(applications),
  creator: one(admins, { fields: [jobs.createdBy], references: [admins.id] }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  resume: one(resumeFiles, {
    fields: [applications.id],
    references: [resumeFiles.applicationId],
  }),
  events: many(applicationEvents),
}));

export const resumeFilesRelations = relations(resumeFiles, ({ one }) => ({
  application: one(applications, {
    fields: [resumeFiles.applicationId],
    references: [applications.id],
  }),
}));

export const applicationEventsRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, {
    fields: [applicationEvents.applicationId],
    references: [applications.id],
  }),
  admin: one(admins, { fields: [applicationEvents.changedBy], references: [admins.id] }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  // Self-reference for the reporting line. Declared via a callback so the
  // table can reference itself without a circular initialisation error.
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: "employee_manager",
  }),
  creator: one(admins, { fields: [employees.createdBy], references: [admins.id] }),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type ResumeFile = typeof resumeFiles.$inferSelect;
export type Admin = typeof admins.$inferSelect;

/* ATS extensions reuse the existing application and audit records. */
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const candidateNotes = pgTable("candidate_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "restrict" }),
  note: text("note").notNull(),
  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  ...timestamps(),
}, t => [index("candidate_notes_application_idx").on(t.applicationId)]);
export const candidateStars = pgTable("candidate_stars", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("candidate_stars_owner_idx").on(t.adminId, t.applicationId)]);
export const jobAssignments = pgTable("job_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
}, t => [uniqueIndex("job_assignments_owner_idx").on(t.adminId, t.jobId)]);
export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "restrict" }),
  type: varchar("type", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("America/Chicago"),
  interviewers: text("interviewers").notNull(),
  location: varchar("location", { length: 300 }),
  meetingUrl: varchar("meeting_url", { length: 500 }),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  ...timestamps(),
}, t => [index("interviews_application_idx").on(t.applicationId), index("interviews_schedule_idx").on(t.status, t.startsAt)]);
export const interviewFeedback = pgTable("interview_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(), technical: integer("technical").notNull(),
  communication: integer("communication").notNull(), teamFit: integer("team_fit").notNull(),
  recommendation: varchar("recommendation", { length: 30 }).notNull(),
  comments: text("comments"), ...timestamps(),
}, t => [uniqueIndex("feedback_interviewer_idx").on(t.interviewId, t.createdBy)]);
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(), name: varchar("name", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(), body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true), ...timestamps(),
}, t => [uniqueIndex("email_template_name_idx").on(t.name)]);
export const emailEvents = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  subject: varchar("subject", { length: 300 }).notNull(), templateName: varchar("template_name", { length: 120 }),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  requestKey: uuid("request_key").notNull(), ...timestamps(),
}, t => [uniqueIndex("email_request_idx").on(t.requestKey), index("email_application_idx").on(t.applicationId)]);
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  href: varchar("href", { length: 300 }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }), ...timestamps(),
}, t => [index("notifications_owner_idx").on(t.adminId, t.readAt, t.createdAt)]);
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 200 }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }), ...timestamps(),
}, t => [index("reminders_due_idx").on(t.adminId, t.dueAt)]);
export const recruitingSettings = pgTable("recruiting_settings", {
  id: integer("id").primaryKey().default(1),
  requireJobApproval: boolean("require_job_approval").notNull().default(false),
});
export const jobTemplates = pgTable("job_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  content: jsonb("content").$type<Partial<NewJob>>().notNull(), ...timestamps(),
}, t => [uniqueIndex("job_template_name_idx").on(t.name)]);
export const jobViews = pgTable("job_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  day: varchar("day", { length: 10 }).notNull(), views: integer("views").notNull().default(0),
}, t => [uniqueIndex("job_views_day_idx").on(t.jobId, t.day)]);

/* ------------------------------------------------------- offer management */

export const offerStatusEnum = pgEnum("offer_status", [
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "VIEWED",
  "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN",
]);
export const offerTemplateCategoryEnum = pgEnum("offer_template_category", [
  "FULL_TIME", "CONTRACT", "REMOTE", "INTERNSHIP", "CUSTOM",
]);

export const offerTemplates = pgTable("offer_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  category: offerTemplateCategoryEnum("category").notNull().default("CUSTOM"),
  subject: varchar("subject", { length: 300 }).notNull(),
  // The templated content region only; branding, signature block and the
  // legal disclaimer are injected by the renderer, never stored per-template.
  bodyHtml: text("body_html").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
  ...timestamps(),
}, t => [uniqueIndex("offer_template_name_idx").on(t.name), index("offer_template_category_idx").on(t.category)]);

/**
 * The stable offer record: identity, secure token, current status, and
 * pointers into offer_versions. An offer is deliberately not 1:1 with an
 * application (a re-offer after a decline is a new row) but is 1:1 with a
 * distributed link, which is why the token lives here rather than on a
 * version. currentVersionId/acceptedVersionId reference offer_versions,
 * declared below — forward-referenced the same way employees.managerId
 * self-references, via a lazy `(): AnyPgColumn => ...` callback.
 */
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "restrict" }),
  templateId: uuid("template_id").references(() => offerTemplates.id, { onDelete: "set null" }),
  status: offerStatusEnum("status").notNull().default("DRAFT"),
  currentVersionId: uuid("current_version_id").references((): AnyPgColumn => offerVersions.id, { onDelete: "set null" }),
  // Set exactly once, at acceptance, and never updated again — this is what
  // makes the accepted document immutable in practice, not just in intent.
  acceptedVersionId: uuid("accepted_version_id").references((): AnyPgColumn => offerVersions.id, { onDelete: "set null" }),

  secureTokenHash: text("secure_token_hash").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

  approvedBy: uuid("approved_by").references(() => admins.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  signedLegalName: varchar("signed_legal_name", { length: 200 }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declineReason: varchar("decline_reason", { length: 40 }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),

  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  ...timestamps(),
}, t => [
  index("offers_application_idx").on(t.applicationId),
  uniqueIndex("offers_one_active_application_idx").on(t.applicationId).where(sql`${t.status} not in ('DECLINED', 'WITHDRAWN', 'EXPIRED')`),
  uniqueIndex("offers_token_hash_idx").on(t.secureTokenHash),
  index("offers_status_idx").on(t.status),
  index("offers_created_idx").on(t.createdAt),
]);

/**
 * Insert-only: creating an offer inserts version 1, editing it inserts
 * version N+1 and repoints offers.currentVersionId. No code path ever
 * updates an existing row here — that is what keeps an accepted version
 * (and its rendered HTML/PDF) permanently frozen.
 */
export const offerVersions = pgTable("offer_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "restrict" }),
  versionNumber: integer("version_number").notNull(),

  jobTitle: varchar("job_title", { length: 200 }).notNull(),
  department: varchar("department", { length: 120 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  remoteType: remoteTypeEnum("remote_type").notNull(),
  hiringManagerName: varchar("hiring_manager_name", { length: 160 }),
  reportsTo: varchar("reports_to", { length: 160 }),

  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  expirationDate: timestamp("expiration_date", { withTimezone: true }).notNull(),
  // Money stored as integer cents to avoid float rounding on a document with
  // acceptance/legal weight. Forms collect dollars; actions convert at the
  // boundary.
  annualSalaryCents: integer("annual_salary_cents"),
  hourlyRateCents: integer("hourly_rate_cents"),
  bonusCents: integer("bonus_cents"),
  signOnBonusCents: integer("sign_on_bonus_cents"),
  otherCompensation: text("other_compensation"),
  benefitsSummary: text("benefits_summary"),
  ptoSummary: text("pto_summary"),
  workLocation: varchar("work_location", { length: 300 }),
  additionalTerms: text("additional_terms"),

  // The exact HTML this version's PDF was (or will be) rendered from, frozen
  // at write time so later template/branding edits can never retroactively
  // change an already-issued or already-accepted document.
  renderedHtml: text("rendered_html").notNull(),
  pdfStoragePath: text("pdf_storage_path"),

  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("offer_versions_offer_version_idx").on(t.offerId, t.versionNumber),
  index("offer_versions_offer_idx").on(t.offerId),
]);

/**
 * One row per OTP request, not per offer — old rows are kept as history
 * rather than deleted. A row is "live" only while attemptCount < 5,
 * unexpired and unconsumed; requesting a new code never deletes prior rows,
 * it just makes them irrelevant to the next verify lookup.
 */
export const offerOtpCodes = pgTable("offer_otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  requestedIp: varchar("requested_ip", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("offer_otp_offer_idx").on(t.offerId)]);

export const offersRelations = relations(offers, ({ one, many }) => ({
  application: one(applications, { fields: [offers.applicationId], references: [applications.id] }),
  template: one(offerTemplates, { fields: [offers.templateId], references: [offerTemplates.id] }),
  currentVersion: one(offerVersions, {
    fields: [offers.currentVersionId],
    references: [offerVersions.id],
    relationName: "offer_current_version",
  }),
  acceptedVersion: one(offerVersions, {
    fields: [offers.acceptedVersionId],
    references: [offerVersions.id],
    relationName: "offer_accepted_version",
  }),
  creator: one(admins, { fields: [offers.createdBy], references: [admins.id] }),
  versions: many(offerVersions),
}));

export const offerVersionsRelations = relations(offerVersions, ({ one }) => ({
  offer: one(offers, { fields: [offerVersions.offerId], references: [offers.id] }),
  creator: one(admins, { fields: [offerVersions.createdBy], references: [admins.id] }),
}));

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type OfferVersion = typeof offerVersions.$inferSelect;
export type NewOfferVersion = typeof offerVersions.$inferInsert;
export type OfferTemplate = typeof offerTemplates.$inferSelect;

/** Shared throttles survive serverless instance restarts. Keys are hashed. */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  keyHash: text("key_hash").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, t => [index("rate_limit_reset_idx").on(t.resetAt)]);

/* ------------------------------------------------------------- invoicing */

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "ACH", "WIRE", "CHECK", "CREDIT_CARD", "OTHER",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  billingAddress: text("billing_address"),
  /** Government/consulting work: the paying agency or department. */
  agency: varchar("agency", { length: 200 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => admins.id, { onDelete: "set null" }),
  ...timestamps(),
}, t => [
  index("clients_company_idx").on(t.companyName),
  index("clients_email_idx").on(sql`lower(${t.email})`),
]);

/**
 * Money is stored as bigint cents throughout. Never floating point: a
 * float cannot represent 0.10 exactly, and invoice arithmetic must balance
 * to the cent. bigint rather than integer because integer cents caps at
 * ~$21.5M, which a contract invoice can legitimately exceed.
 *
 * Totals are derived columns: they are recomputed from the line items
 * server-side on every write and never taken from the browser.
 */
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),

  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
  discountCents: bigint("discount_cents", { mode: "number" }).notNull().default(0),
  taxCents: bigint("tax_cents", { mode: "number" }).notNull().default(0),
  additionalChargesCents: bigint("additional_charges_cents", { mode: "number" }).notNull().default(0),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  amountPaidCents: bigint("amount_paid_cents", { mode: "number" }).notNull().default(0),
  balanceDueCents: bigint("balance_due_cents", { mode: "number" }).notNull().default(0),
  /** Basis points (e.g. 825 = 8.25%), so tax rates stay exact. */
  taxRateBasisPoints: integer("tax_rate_basis_points").notNull().default(0),

  poNumber: varchar("po_number", { length: 120 }),
  contractNumber: varchar("contract_number", { length: 120 }),
  taskOrder: varchar("task_order", { length: 120 }),
  projectName: varchar("project_name", { length: 200 }),
  periodOfPerformance: varchar("period_of_performance", { length: 160 }),

  paymentTerms: varchar("payment_terms", { length: 120 }),
  notes: text("notes"),
  /** Frozen copy of the client's billing details, so editing a client later
   *  never rewrites history on an already-issued invoice. */
  billingSnapshot: jsonb("billing_snapshot").$type<{
    companyName: string; contactName?: string | null; email?: string | null;
    phone?: string | null; billingAddress?: string | null; agency?: string | null;
  }>(),

  pdfStoragePath: text("pdf_storage_path"),
  secureTokenHash: text("secure_token_hash"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentBy: uuid("sent_by").references(() => admins.id, { onDelete: "set null" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedBy: uuid("voided_by").references(() => admins.id, { onDelete: "set null" }),
  voidReason: text("void_reason"),

  createdBy: uuid("created_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  ...timestamps(),
}, t => [
  uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
  uniqueIndex("invoices_token_hash_idx").on(t.secureTokenHash),
  index("invoices_client_idx").on(t.clientId),
  index("invoices_status_idx").on(t.status),
  index("invoices_due_idx").on(t.dueDate),
  index("invoices_created_idx").on(t.createdAt),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  /** Explicit ordering so rows can be reordered without relying on insert order. */
  position: integer("position").notNull().default(0),
  description: text("description").notNull(),
  /** Thousandths of a unit (e.g. 1500 = 1.5 hours) — exact, no float. */
  quantityMilli: bigint("quantity_milli", { mode: "number" }).notNull(),
  rateCents: bigint("rate_cents", { mode: "number" }).notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  servicePeriod: varchar("service_period", { length: 160 }),
  consultantName: varchar("consultant_name", { length: 160 }),
  projectRef: varchar("project_ref", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("invoice_items_invoice_idx").on(t.invoiceId, t.position)]);

export const invoicePayments = pgTable("invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "restrict" }),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  paidOn: timestamp("paid_on", { withTimezone: true }).notNull(),
  method: paymentMethodEnum("method").notNull().default("ACH"),
  reference: varchar("reference", { length: 160 }),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("invoice_payments_invoice_idx").on(t.invoiceId, t.paidOn)]);

export const invoiceSettings = pgTable("invoice_settings", {
  id: integer("id").primaryKey().default(1),
  invoicePrefix: varchar("invoice_prefix", { length: 16 }).notNull().default("SOH"),
  /** Per-year counter backing the invoice number; bumped under a row lock. */
  nextSequence: integer("next_sequence").notNull().default(1),
  sequenceYear: integer("sequence_year").notNull().default(2026),
  defaultPaymentTerms: varchar("default_payment_terms", { length: 120 }).notNull().default("Net 30"),
  defaultNotes: text("default_notes"),
  paymentInstructions: text("payment_instructions"),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("USD"),
  defaultTaxRateBasisPoints: integer("default_tax_rate_basis_points").notNull().default(0),
  /** Overrides src/lib/site.ts only when a billing entity differs from it. */
  legalName: varchar("legal_name", { length: 200 }),
  billingAddress: text("billing_address"),
  billingEmail: varchar("billing_email", { length: 255 }),
  billingPhone: varchar("billing_phone", { length: 40 }),
  taxId: varchar("tax_id", { length: 60 }),
  ...timestamps(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
  creator: one(admins, { fields: [invoices.createdBy], references: [admins.id] }),
}));
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));
export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] }),
  recorder: one(admins, { fields: [invoicePayments.recordedBy], references: [admins.id] }),
}));
export const clientsRelations = relations(clients, ({ many }) => ({ invoices: many(invoices) }));

export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InvoiceSettings = typeof invoiceSettings.$inferSelect;
