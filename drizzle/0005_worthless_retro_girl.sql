CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('ACH', 'WIRE', 'CHECK', 'CREDIT_CARD', 'OTHER');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(160),
	"email" varchar(255),
	"phone" varchar(40),
	"billing_address" text,
	"agency" varchar(200),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"quantity_milli" bigint NOT NULL,
	"rate_cents" bigint NOT NULL,
	"amount_cents" bigint NOT NULL,
	"service_period" varchar(160),
	"consultant_name" varchar(160),
	"project_ref" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"paid_on" timestamp with time zone NOT NULL,
	"method" "payment_method" DEFAULT 'ACH' NOT NULL,
	"reference" varchar(160),
	"notes" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"invoice_prefix" varchar(16) DEFAULT 'SOH' NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"sequence_year" integer DEFAULT 2026 NOT NULL,
	"default_payment_terms" varchar(120) DEFAULT 'Net 30' NOT NULL,
	"default_notes" text,
	"payment_instructions" text,
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"default_tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"legal_name" varchar(200),
	"billing_address" text,
	"billing_email" varchar(255),
	"billing_phone" varchar(40),
	"tax_id" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(40) NOT NULL,
	"client_id" uuid,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal_cents" bigint DEFAULT 0 NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"tax_cents" bigint DEFAULT 0 NOT NULL,
	"additional_charges_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"amount_paid_cents" bigint DEFAULT 0 NOT NULL,
	"balance_due_cents" bigint DEFAULT 0 NOT NULL,
	"tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"po_number" varchar(120),
	"contract_number" varchar(120),
	"task_order" varchar(120),
	"project_name" varchar(200),
	"period_of_performance" varchar(160),
	"payment_terms" varchar(120),
	"notes" text,
	"billing_snapshot" jsonb,
	"pdf_storage_path" text,
	"secure_token_hash" text,
	"token_expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"viewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_recorded_by_admins_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sent_by_admins_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_admins_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_company_idx" ON "clients" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_idx" ON "invoice_payments" USING btree ("invoice_id","paid_on");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_token_hash_idx" ON "invoices" USING btree ("secure_token_hash");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "invoices_created_idx" ON "invoices" USING btree ("created_at");