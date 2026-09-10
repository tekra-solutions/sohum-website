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

-- Default deny: with RLS enabled and no permissive policy, anon and
-- authenticated roles can do nothing. The service role bypasses RLS entirely,
-- which is how the server reads and writes.

-- The single public exception: anyone may read PUBLISHED jobs.
DROP POLICY IF EXISTS "public can read published jobs" ON jobs;
CREATE POLICY "public can read published jobs"
  ON jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

-- Applications, resumes, events, admins and audit logs have NO permissive
-- policy on purpose. Only the service role touches them.

-- Storage: the resumes bucket must be private. Create it with
--   insert into storage.buckets (id, name, public) values ('resumes','resumes',false)
--     on conflict (id) do update set public = false;
-- No storage policies are granted to anon/authenticated, so objects are
-- reachable only through server-minted signed URLs.
