CREATE TYPE "public"."offer_signature_type" AS ENUM('TYPED', 'DRAWN');--> statement-breakpoint
CREATE TABLE "offer_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"offer_version_id" uuid NOT NULL,
	"candidate_legal_name" varchar(200) NOT NULL,
	"candidate_email" varchar(255) NOT NULL,
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
ALTER TABLE "offer_templates" ADD COLUMN "terms_html" text;--> statement-breakpoint
ALTER TABLE "offer_templates" ADD COLUMN "acknowledgements_html" text;--> statement-breakpoint
ALTER TABLE "offer_signatures" ADD CONSTRAINT "offer_signatures_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_signatures" ADD CONSTRAINT "offer_signatures_offer_version_id_offer_versions_id_fk" FOREIGN KEY ("offer_version_id") REFERENCES "public"."offer_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_signatures_offer_idx" ON "offer_signatures" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offer_signatures_version_idx" ON "offer_signatures" USING btree ("offer_version_id");