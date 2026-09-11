ALTER TABLE "recruiting_settings" ADD COLUMN "authorized_rep_name" varchar(200);--> statement-breakpoint
ALTER TABLE "recruiting_settings" ADD COLUMN "authorized_rep_title" varchar(200);--> statement-breakpoint
ALTER TABLE "recruiting_settings" ADD COLUMN "default_benefits_summary" text;--> statement-breakpoint
ALTER TABLE "recruiting_settings" ADD COLUMN "default_pto_summary" text;--> statement-breakpoint
ALTER TABLE "recruiting_settings" ADD COLUMN "hr_contact_email" varchar(255);