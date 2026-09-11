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
