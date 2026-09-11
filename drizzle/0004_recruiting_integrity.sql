CREATE TABLE "rate_limit_buckets" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_reset_idx" ON "rate_limit_buckets" USING btree ("reset_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_one_active_application_idx" ON "offers" USING btree ("application_id") WHERE "offers"."status" not in ('DECLINED', 'WITHDRAWN', 'EXPIRED');
--> statement-breakpoint
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION protect_offer_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Offer versions cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - 'pdf_storage_path') IS DISTINCT FROM (to_jsonb(OLD) - 'pdf_storage_path') THEN
    RAISE EXCEPTION 'Offer version content is immutable; create a new version';
  END IF;
  IF NEW.pdf_storage_path IS DISTINCT FROM OLD.pdf_storage_path AND EXISTS (
    SELECT 1 FROM offers WHERE accepted_version_id = OLD.id
  ) THEN RAISE EXCEPTION 'Accepted offer PDF is immutable'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER protect_offer_version BEFORE UPDATE OR DELETE ON offer_versions
FOR EACH ROW EXECUTE FUNCTION protect_offer_version();
--> statement-breakpoint
CREATE FUNCTION protect_offer_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM offer_versions WHERE id = NEW.current_version_id AND offer_id = NEW.id
  ) THEN RAISE EXCEPTION 'Current version must belong to this offer'; END IF;
  IF NEW.accepted_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM offer_versions WHERE id = NEW.accepted_version_id AND offer_id = NEW.id
  ) THEN RAISE EXCEPTION 'Accepted version must belong to this offer'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.accepted_version_id IS NOT NULL AND (
    NEW.accepted_version_id IS DISTINCT FROM OLD.accepted_version_id OR
    NEW.current_version_id IS DISTINCT FROM OLD.current_version_id OR
    NEW.status IS DISTINCT FROM OLD.status OR NEW.signed_legal_name IS DISTINCT FROM OLD.signed_legal_name OR
    NEW.signed_at IS DISTINCT FROM OLD.signed_at OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
  ) THEN RAISE EXCEPTION 'Accepted offer signature and version are immutable'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER protect_offer_links BEFORE INSERT OR UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION protect_offer_links();
