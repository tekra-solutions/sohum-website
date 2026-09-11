ALTER TYPE "public"."admin_role" ADD VALUE 'RECRUITING_ADMIN';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'HIRING_MANAGER';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'PENDING_APPROVAL' BEFORE 'PUBLISHED';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'APPROVED' BEFORE 'PUBLISHED';--> statement-breakpoint
CREATE TABLE "candidate_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_stars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"subject" varchar(300) NOT NULL,
	"template_name" varchar(120),
	"status" varchar(30) DEFAULT 'Pending' NOT NULL,
	"request_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"rating" integer NOT NULL,
	"technical" integer NOT NULL,
	"communication" integer NOT NULL,
	"team_fit" integer NOT NULL,
	"recommendation" varchar(30) NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"status" varchar(30) DEFAULT 'Scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/Chicago' NOT NULL,
	"interviewers" text NOT NULL,
	"location" varchar(300),
	"meeting_url" varchar(500),
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"application_id" uuid,
	"title" varchar(200) NOT NULL,
	"href" varchar(300) NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruiting_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"require_job_approval" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Rename the existing value in place, preserving historical events.
ALTER TYPE "public"."application_status" RENAME VALUE 'REVIEWING' TO 'SCREENING';--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'OFFER';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "skills" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_stars" ADD CONSTRAINT "candidate_stars_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_stars" ADD CONSTRAINT "candidate_stars_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_notes_application_idx" ON "candidate_notes" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_stars_owner_idx" ON "candidate_stars" USING btree ("admin_id","application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_request_idx" ON "email_events" USING btree ("request_key");--> statement-breakpoint
CREATE INDEX "email_application_idx" ON "email_events" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_template_name_idx" ON "email_templates" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_interviewer_idx" ON "interview_feedback" USING btree ("interview_id","created_by");--> statement-breakpoint
CREATE INDEX "interviews_application_idx" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "interviews_schedule_idx" ON "interviews" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_assignments_owner_idx" ON "job_assignments" USING btree ("admin_id","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_template_name_idx" ON "job_templates" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "job_views_day_idx" ON "job_views" USING btree ("job_id","day");--> statement-breakpoint
CREATE INDEX "notifications_owner_idx" ON "notifications" USING btree ("admin_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("admin_id","due_at");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_to_admins_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_source_application_id_applications_id_fk" FOREIGN KEY ("source_application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_assigned_idx" ON "applications" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "applications_source_idx" ON "applications" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_source_application_idx" ON "employees" USING btree ("source_application_id");
--> statement-breakpoint
ALTER TABLE "candidate_notes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "candidate_notes" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "candidate_stars" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "candidate_stars" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "email_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "email_events" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "email_templates" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "interview_feedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "interview_feedback" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "interviews" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "job_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "job_assignments" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "job_templates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "job_templates" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "job_views" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "job_views" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "notifications" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "reminders" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE "recruiting_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "recruiting_settings" FROM anon, authenticated;

--> statement-breakpoint
ALTER TABLE interviews ADD CONSTRAINT interviews_times_check CHECK (ends_at > starts_at);
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check CHECK (status IN ('Scheduled','Completed','Cancelled','Rescheduled'));
ALTER TABLE interview_feedback ADD CONSTRAINT feedback_ratings_check CHECK (rating BETWEEN 1 AND 5 AND technical BETWEEN 1 AND 5 AND communication BETWEEN 1 AND 5 AND team_fit BETWEEN 1 AND 5);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX applications_tags_idx ON applications USING gin(tags);
UPDATE applications SET source = 'Company Website' WHERE source IS NULL OR source = '';
