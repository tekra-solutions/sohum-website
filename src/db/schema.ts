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

export const adminRoleEnum = pgEnum("admin_role", ["ADMIN", "RECRUITER", "SUPER_ADMIN"]);

export const jobStatusEnum = pgEnum("job_status", ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]);

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

export const applicationStatusEnum = pgEnum("application_status", [
  "NEW",
  "REVIEWING",
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

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("applications_reference_idx").on(t.reference),
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

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type ResumeFile = typeof resumeFiles.$inferSelect;
export type Admin = typeof admins.$inferSelect;
