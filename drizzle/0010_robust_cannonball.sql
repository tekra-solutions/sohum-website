CREATE TYPE "public"."employment_event_type" AS ENUM('HIRED', 'PROMOTED', 'TRANSFERRED', 'COMPENSATION_CHANGED', 'STATUS_CHANGED', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'EFFECTIVE');--> statement-breakpoint
CREATE TABLE "employment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"event_type" "employment_event_type" NOT NULL,
	"promotion_id" uuid,
	"promotion_version_id" uuid,
	"previous_job_title" varchar(200),
	"job_title" varchar(200),
	"previous_department" varchar(120),
	"department" varchar(120),
	"previous_location" varchar(160),
	"location" varchar(160),
	"previous_manager_name" varchar(160),
	"manager_name" varchar(160),
	"previous_annual_salary_cents" integer,
	"annual_salary_cents" integer,
	"previous_hourly_rate_cents" integer,
	"hourly_rate_cents" integer,
	"effective_date" timestamp with time zone NOT NULL,
	"signed_at" timestamp with time zone,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"promotion_version_id" uuid NOT NULL,
	"signer_legal_name" varchar(200) NOT NULL,
	"signer_email" varchar(255) NOT NULL,
	"signature_type" "offer_signature_type" DEFAULT 'TYPED' NOT NULL,
	"signature_value" text NOT NULL,
	"electronic_consent" boolean DEFAULT false NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"verification_method" varchar(40) DEFAULT 'EMAIL_OTP' NOT NULL,
	"signer_ip" varchar(64),
	"signer_user_agent" varchar(400),
	"document_hash" varchar(64),
	"signed_pdf_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"previous_job_title" varchar(200) NOT NULL,
	"previous_department" varchar(120) NOT NULL,
	"previous_location" varchar(160),
	"previous_employment_type" "employment_type" NOT NULL,
	"previous_manager_name" varchar(160),
	"previous_annual_salary_cents" integer,
	"previous_hourly_rate_cents" integer,
	"job_title" varchar(200) NOT NULL,
	"department" varchar(120) NOT NULL,
	"location" varchar(160),
	"employment_type" "employment_type" NOT NULL,
	"remote_type" "remote_type",
	"manager_id" uuid,
	"manager_name" varchar(160),
	"effective_date" timestamp with time zone NOT NULL,
	"expiration_date" timestamp with time zone NOT NULL,
	"annual_salary_cents" integer,
	"hourly_rate_cents" integer,
	"bonus_cents" integer,
	"other_compensation" text,
	"benefits_summary" text,
	"pto_summary" text,
	"additional_terms" text,
	"rendered_html" text NOT NULL,
	"template_body_html" text,
	"template_terms_html" text,
	"template_acknowledgements_html" text,
	"pdf_storage_path" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "promotion_status" DEFAULT 'DRAFT' NOT NULL,
	"current_version_id" uuid,
	"accepted_version_id" uuid,
	"secure_token_hash" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"signed_legal_name" varchar(200),
	"signed_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" varchar(40),
	"withdrawn_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_promotion_version_id_promotion_versions_id_fk" FOREIGN KEY ("promotion_version_id") REFERENCES "public"."promotion_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_otp_codes" ADD CONSTRAINT "promotion_otp_codes_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_signatures" ADD CONSTRAINT "promotion_signatures_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_signatures" ADD CONSTRAINT "promotion_signatures_promotion_version_id_promotion_versions_id_fk" FOREIGN KEY ("promotion_version_id") REFERENCES "public"."promotion_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_versions" ADD CONSTRAINT "promotion_versions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_versions" ADD CONSTRAINT "promotion_versions_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_versions" ADD CONSTRAINT "promotion_versions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_template_id_offer_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_current_version_id_promotion_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."promotion_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_accepted_version_id_promotion_versions_id_fk" FOREIGN KEY ("accepted_version_id") REFERENCES "public"."promotion_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employment_events_employee_idx" ON "employment_events" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employment_events_effective_idx" ON "employment_events" USING btree ("effective_date");--> statement-breakpoint
CREATE UNIQUE INDEX "employment_events_promotion_idx" ON "employment_events" USING btree ("promotion_id") WHERE "employment_events"."promotion_id" is not null;--> statement-breakpoint
CREATE INDEX "promotion_otp_promotion_idx" ON "promotion_otp_codes" USING btree ("promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_signatures_promotion_idx" ON "promotion_signatures" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "promotion_signatures_version_idx" ON "promotion_signatures" USING btree ("promotion_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_versions_number_idx" ON "promotion_versions" USING btree ("promotion_id","version_number");--> statement-breakpoint
CREATE INDEX "promotion_versions_promotion_idx" ON "promotion_versions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "promotions_employee_idx" ON "promotions" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_one_active_employee_idx" ON "promotions" USING btree ("employee_id") WHERE "promotions"."status" not in ('DECLINED', 'WITHDRAWN', 'EXPIRED', 'EFFECTIVE');--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_token_hash_idx" ON "promotions" USING btree ("secure_token_hash");--> statement-breakpoint
CREATE INDEX "promotions_status_idx" ON "promotions" USING btree ("status");