CREATE TYPE "public"."offer_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."offer_template_category" AS ENUM('FULL_TIME', 'CONTRACT', 'REMOTE', 'INTERNSHIP', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "offer_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"requested_ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" "offer_template_category" DEFAULT 'CUSTOM' NOT NULL,
	"subject" varchar(300) NOT NULL,
	"body_html" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"job_title" varchar(200) NOT NULL,
	"department" varchar(120) NOT NULL,
	"location" varchar(160) NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"remote_type" "remote_type" NOT NULL,
	"hiring_manager_name" varchar(160),
	"reports_to" varchar(160),
	"start_date" timestamp with time zone NOT NULL,
	"expiration_date" timestamp with time zone NOT NULL,
	"annual_salary_cents" integer,
	"hourly_rate_cents" integer,
	"bonus_cents" integer,
	"sign_on_bonus_cents" integer,
	"other_compensation" text,
	"benefits_summary" text,
	"pto_summary" text,
	"work_location" varchar(300),
	"additional_terms" text,
	"rendered_html" text NOT NULL,
	"pdf_storage_path" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "offer_status" DEFAULT 'DRAFT' NOT NULL,
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
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer_otp_codes" ADD CONSTRAINT "offer_otp_codes_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_versions" ADD CONSTRAINT "offer_versions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_offer_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_current_version_id_offer_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_accepted_version_id_offer_versions_id_fk" FOREIGN KEY ("accepted_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_otp_offer_idx" ON "offer_otp_codes" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_template_name_idx" ON "offer_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "offer_template_category_idx" ON "offer_templates" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_versions_offer_version_idx" ON "offer_versions" USING btree ("offer_id","version_number");--> statement-breakpoint
CREATE INDEX "offer_versions_offer_idx" ON "offer_versions" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offers_application_idx" ON "offers" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_token_hash_idx" ON "offers" USING btree ("secure_token_hash");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_created_idx" ON "offers" USING btree ("created_at");