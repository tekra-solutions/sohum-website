-- Row Level Security for the Sohum recruitment schema.
--
-- The application connects with the service role and enforces authorization in
-- server code. RLS is defence in depth: if the anon key ever reached a client,
-- it must not be able to read applicant data.
--
-- Run once in the Supabase SQL editor after the Drizzle migration.

ALTER TABLE admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_files        ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees           ENABLE ROW LEVEL SECURITY;

-- Applicant tracking tables added alongside the recruiting workspace. These
-- hold recruiter notes, interview records, hiring feedback and candidate
-- correspondence, so they follow the same default-deny rule as applications.
ALTER TABLE candidate_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_stars      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_views            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiting_settings  ENABLE ROW LEVEL SECURITY;

-- Offer letter management. offers/offer_versions hold compensation and
-- signature data; offer_templates and offer_otp_codes are support tables for
-- the same feature. The candidate-facing /offer/[token] route reads all four
-- exclusively through the service-role connection — never a Supabase
-- anon/authenticated client — so none of them gets a permissive policy either.
ALTER TABLE rate_limit_buckets     ENABLE ROW LEVEL SECURITY;

-- Invoicing. Client billing details, contract references and payment records
-- are commercially sensitive; like every other table here they are reachable
-- only through the service-role connection, never an anon/authenticated key.
ALTER TABLE clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_otp_codes       ENABLE ROW LEVEL SECURITY;

-- Default deny: with RLS enabled and no permissive policy, anon and
-- authenticated roles can do nothing. The service role bypasses RLS entirely,
-- which is how the server reads and writes.

-- The single public exception: anyone may read PUBLISHED jobs.
DROP POLICY IF EXISTS "public can read published jobs" ON jobs;
CREATE POLICY "public can read published jobs"
  ON jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

-- Applications, resumes, events, admins, employees, audit logs and every
-- applicant tracking and offer-management table above have NO permissive
-- policy on purpose. Employee rows, recruiter notes and offer compensation
-- are PII and must never be readable with the anon key. Only the service role
-- touches them. Job views are written by the server on behalf of visitors, so
-- they need no anon policy either.

-- Storage: the resumes and offers buckets must both be private. Create them with
--   insert into storage.buckets (id, name, public) values ('resumes','resumes',false)
--     on conflict (id) do update set public = false;
--   insert into storage.buckets (id, name, public) values ('offers','offers',false)
--     on conflict (id) do update set public = false;
-- No storage policies are granted to anon/authenticated, so objects are
-- reachable only through server-minted signed URLs.
