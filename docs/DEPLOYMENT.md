# Deployment & setup

The recruitment platform needs a Postgres database, a private storage bucket,
and an email provider for candidate offer verification. Use Node.js 22 (`nvm use`).

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI.**
   Copy both the **pooled** (port `6543`) and **direct** (port `5432`) strings.
   The app uses the pooled connection; migrations use the direct one.
3. **Project Settings → API.** Copy the project URL and the `service_role` key.

> The `service_role` key bypasses Row Level Security. It is server-only and must
> never be placed in a `NEXT_PUBLIC_*` variable.

## 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `DIRECT_DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and generate a signing secret:

```bash
openssl rand -base64 32   # -> AUTH_SECRET
```

## 3. Run migrations

```bash
npm run db:migrate
```

Then open the Supabase SQL editor and run `drizzle/rls-policies.sql` to enable
Row Level Security.

## 4. Create the storage bucket

Supabase -> **Storage -> New bucket**

- Names: `resumes`, `offers` and `invoices`
- **Public: OFF** — required. Resumes are private HR data, served only through
  short-lived signed URLs minted server-side.

## 5. Create the first admin

```bash
npm run create-admin
```

Prompts for name, email and password. Hashed with bcrypt (cost 12). No default
credential exists anywhere in the codebase.

Sign in at `/admin/login`.

## 6. Email

Set `RESEND_API_KEY` **or** the `SMTP_*` variables, plus `EMAIL_FROM` and
`ADMIN_EMAIL`. SMTP support is included. Offer delivery and candidate OTP verification require a configured provider.

If neither is configured, sends are logged and skipped — applications still
submit successfully. Verify your sending domain before going live.

## 7. Deploy to Vercel

Add every variable from `.env.local` to the Vercel project (Settings ->
Environment Variables), and set `NEXT_PUBLIC_APP_URL` to the production URL so
email links resolve correctly.

```bash
npm run build   # verify locally first
```

## 8. Scheduled jobs

One job runs on a schedule: it applies accepted promotions once their effective
date arrives. A promotion is signed in advance and takes effect later, so
without this nothing notices when that date passes and a signed promotion would
sit waiting for an admin to press "Apply".

`vercel.json` declares the schedule (daily at 06:10 UTC, shortly after
effective dates roll over worldwide). Vercel picks it up automatically on
deploy — there is nothing to configure in the dashboard.

**Set `CRON_SECRET` in the Vercel project before deploying:**

```bash
openssl rand -base64 32   # -> CRON_SECRET
```

The endpoint mutates employee records, so it refuses every request unless this
secret is presented as a bearer token. Vercel Cron sends it automatically once
the variable is set on the project. **If the secret is unset the endpoint fails
closed** — safe, but promotions will never take effect on their own. Settings →
Integrations shows whether it is configured.

To run it by hand, or to verify it after deploying:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP/api/cron/promotions
# {"ok":true,"considered":1,"applied":1,"failures":[],"durationMs":36}
```

The job is idempotent: a retry, an overlapping run, or a manual call during an
incident cannot double-apply a promotion or double-write its history row.
Admins can still apply a due promotion by hand from its detail screen; both
paths call the same function.

## Operational notes

- **Jobs with applications are archived, never deleted.** The foreign key is
  `ON DELETE RESTRICT`, so the database refuses to orphan an application.
- **Rate limiting uses atomic PostgreSQL counters**, shared across serverless instances.
  Expired buckets are reaped opportunistically on a small fraction of requests, so the
  table stays bounded without a scheduled job.
- **Migration 0004 is required before deploying this revision.** It adds shared throttles,
  prevents multiple active offers for one application, and makes offer version content and accepted signatures immutable.
  If the unique index reports existing duplicate active offers, resolve those records explicitly before retrying; the migration does not discard HR data.
- **Resume uploads are limited to 4 MB** to leave multipart overhead under
  [Vercel's request limit](https://vercel.com/docs/errors/function_payload_too_large).
- **Offer PDFs use bundled Linux Chromium on Vercel.** Local previews detect Chrome,
  or use `CHROME_EXECUTABLE_PATH`. Keep the Node.js runtime at 22.x.
- Verify a real provider delivery, OTP and private-storage download in the deployment environment;
  integration tests deliberately use mock email/storage adapters.
- **Audit log** records admin logins, job mutations, status changes and resume
  downloads in `audit_logs`. Scheduled promotion runs are recorded there too,
  with `entity_type = 'cron'`, and carry the counts for that run.
- **Promotions never change an employee record when signed.** Signing sets
  ACCEPTED; the record moves only when the effective date arrives, either via
  the scheduled job above or an admin pressing "Apply". Previous title and
  compensation are kept in `employment_events`, which is append-only.
