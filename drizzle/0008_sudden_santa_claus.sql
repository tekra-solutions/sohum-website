-- Short human-facing job numbers (e.g. 501283) for quoting, searching and
-- admin URLs.
--
-- A plain serial would start at 1, making the total number of jobs obvious
-- from any single ID. This starts at a non-obvious offset instead, and the
-- sequence's own INCREMENT advances it -- nextval() is atomic, so concurrent
-- inserts can never receive the same number. (An earlier attempt advanced the
-- sequence with setval() to randomise the step; that reads and writes
-- non-atomically, so parallel sessions collided.)
--
-- The step is a fixed 7 rather than random: uniqueness under concurrency
-- matters more than hiding the gap, and the starting offset already prevents
-- a single number from disclosing the job count.
--
-- The UUID remains the primary key; this is a display and lookup key only.
CREATE SEQUENCE IF NOT EXISTS "job_reference_seq"
  START WITH 501283
  INCREMENT BY 7
  MINVALUE 100000
  MAXVALUE 999999
  NO CYCLE;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "reference" integer DEFAULT nextval('job_reference_seq') NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_reference_idx" ON "jobs" USING btree ("reference");
