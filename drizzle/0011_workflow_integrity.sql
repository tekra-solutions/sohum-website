ALTER TABLE "invoice_payments" ADD COLUMN "request_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "document_html" text;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_payments_request_key_idx" ON "invoice_payments" USING btree ("request_key");
--> statement-breakpoint
CREATE FUNCTION protect_business_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Business history is append-only';
END $$;
--> statement-breakpoint
CREATE TRIGGER employment_history_immutable BEFORE UPDATE OR DELETE ON employment_events
FOR EACH ROW EXECUTE FUNCTION protect_business_history();
--> statement-breakpoint
CREATE FUNCTION protect_signature_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Signatures cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - 'signed_pdf_path' - 'document_hash') IS DISTINCT FROM (to_jsonb(OLD) - 'signed_pdf_path' - 'document_hash')
    OR (OLD.signed_pdf_path IS NOT NULL AND NEW.signed_pdf_path IS DISTINCT FROM OLD.signed_pdf_path)
    OR (OLD.document_hash IS NOT NULL AND NEW.document_hash IS DISTINCT FROM OLD.document_hash)
  THEN RAISE EXCEPTION 'Signed evidence is immutable'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER offer_signature_immutable BEFORE UPDATE OR DELETE ON offer_signatures
FOR EACH ROW EXECUTE FUNCTION protect_signature_record();
--> statement-breakpoint
CREATE TRIGGER promotion_signature_immutable BEFORE UPDATE OR DELETE ON promotion_signatures
FOR EACH ROW EXECUTE FUNCTION protect_signature_record();
--> statement-breakpoint
CREATE FUNCTION protect_promotion_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Promotion versions cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - 'pdf_storage_path') IS DISTINCT FROM (to_jsonb(OLD) - 'pdf_storage_path')
    OR (OLD.pdf_storage_path IS NOT NULL AND NEW.pdf_storage_path IS DISTINCT FROM OLD.pdf_storage_path)
  THEN RAISE EXCEPTION 'Promotion content is immutable; create a new version'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER promotion_version_immutable BEFORE UPDATE OR DELETE ON promotion_versions
FOR EACH ROW EXECUTE FUNCTION protect_promotion_version();
--> statement-breakpoint
CREATE FUNCTION protect_promotion_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM promotion_versions WHERE id = NEW.current_version_id AND promotion_id = NEW.id)
    THEN RAISE EXCEPTION 'Current version must belong to this promotion'; END IF;
  IF NEW.accepted_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM promotion_versions WHERE id = NEW.accepted_version_id AND promotion_id = NEW.id)
    THEN RAISE EXCEPTION 'Accepted version must belong to this promotion'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.accepted_version_id IS NOT NULL AND (
    NEW.accepted_version_id IS DISTINCT FROM OLD.accepted_version_id OR NEW.current_version_id IS DISTINCT FROM OLD.current_version_id
    OR NEW.signed_legal_name IS DISTINCT FROM OLD.signed_legal_name OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
    OR NEW.status NOT IN ('ACCEPTED', 'EFFECTIVE', 'WITHDRAWN')
    OR (OLD.status IN ('EFFECTIVE','WITHDRAWN') AND NEW.status IS DISTINCT FROM OLD.status)
  ) THEN RAISE EXCEPTION 'Signed promotion terms are immutable'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER promotion_links_valid BEFORE INSERT OR UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION protect_promotion_links();
--> statement-breakpoint
ALTER TABLE invoices ADD CONSTRAINT invoice_balance_valid CHECK (
  subtotal_cents >= 0 AND discount_cents >= 0 AND discount_cents <= subtotal_cents
  AND tax_cents >= 0 AND additional_charges_cents >= 0
  AND total_cents = subtotal_cents - discount_cents + tax_cents + additional_charges_cents
  AND amount_paid_cents >= 0 AND amount_paid_cents <= total_cents
  AND balance_due_cents = total_cents - amount_paid_cents
) NOT VALID;
--> statement-breakpoint
ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payment_positive CHECK (amount_cents > 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE promotion_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_events ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE FUNCTION check_signature_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'offer_signatures' THEN
    IF NOT EXISTS (SELECT 1 FROM offer_versions WHERE id = NEW.offer_version_id AND offer_id = NEW.offer_id)
      THEN RAISE EXCEPTION 'Signature version must belong to its offer'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM promotion_versions WHERE id = NEW.promotion_version_id AND promotion_id = NEW.promotion_id)
      THEN RAISE EXCEPTION 'Signature version must belong to its promotion'; END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER offer_signature_version_valid BEFORE INSERT ON offer_signatures
FOR EACH ROW EXECUTE FUNCTION check_signature_version();
--> statement-breakpoint
CREATE TRIGGER promotion_signature_version_valid BEFORE INSERT ON promotion_signatures
FOR EACH ROW EXECUTE FUNCTION check_signature_version();
