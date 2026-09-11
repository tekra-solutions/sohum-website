CREATE TYPE "public"."employment_status" AS ENUM('ACTIVE', 'ON_LEAVE', 'TERMINATED');--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar(32) NOT NULL,
	"sequence" bigserial NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"work_email" varchar(255) NOT NULL,
	"personal_email" varchar(255),
	"phone" varchar(40),
	"job_title" varchar(160) NOT NULL,
	"department" varchar(120) NOT NULL,
	"location" varchar(160),
	"employment_type" "employment_type" DEFAULT 'FULL_TIME' NOT NULL,
	"status" "employment_status" DEFAULT 'ACTIVE' NOT NULL,
	"manager_id" uuid,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"source_application_id" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_employee_id_idx" ON "employees" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_work_email_lower_idx" ON "employees" USING btree (lower("work_email"));--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department");