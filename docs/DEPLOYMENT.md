# Deployment & setup

The recruitment platform needs a Postgres database, a private storage bucket,
and (optionally) an email provider. Roughly 15 minutes end to end.

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

- Name: `resumes`
- **Public: OFF** — required. Resumes are private HR data, served only through
  short-lived signed URLs minted server-side.

## 5. Create the first admin

```bash
npm run create-admin
```

Prompts for name, email and password. Hashed with bcrypt (cost 12). No default
credential exists anywhere in the codebase.

Sign in at `/admin/login`.

## 6. Email (optional)

Set `RESEND_API_KEY` **or** the `SMTP_*` variables, plus `EMAIL_FROM` and
`ADMIN_EMAIL`. For SMTP also run `npm i nodemailer`.

If neither is configured, sends are logged and skipped — applications still
submit successfully. Verify your sending domain before going live.

## 7. Deploy to Vercel

Add every variable from `.env.local` to the Vercel project (Settings ->
Environment Variables), and set `NEXT_PUBLIC_APP_URL` to the production URL so
email links resolve correctly.

```bash
npm run build   # verify locally first
```

## Operational notes

- **Jobs with applications are archived, never deleted.** The foreign key is
  `ON DELETE RESTRICT`, so the database refuses to orphan an application.
- **Rate limiting is in-memory**, so on serverless each instance counts
  separately. It throttles casual abuse. For stricter guarantees swap
  `src/lib/rate-limit/index.ts` for a shared store (Upstash Redis); the
  interface is already async.
- **Audit log** records admin logins, job mutations, status changes and resume
  downloads in `audit_logs`.
