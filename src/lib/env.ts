/**
 * Environment access.
 *
 * Split deliberately: `serverEnv()` throws if a server-only secret is missing,
 * and is never imported into a client component. Anything the browser may see
 * must be NEXT_PUBLIC_ and live in `publicEnv`.
 */
import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for setup.`,
    );
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function serverEnv() {
  return {
    databaseUrl: required("DATABASE_URL"),
    authSecret: required("AUTH_SECRET"),

    supabaseUrl: optional("SUPABASE_URL"),
    supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: optional("STORAGE_BUCKET", "resumes"),

    emailFrom: optional("EMAIL_FROM"),
    adminEmail: optional("ADMIN_EMAIL"),
    resendApiKey: optional("RESEND_API_KEY"),
    smtpHost: optional("SMTP_HOST"),
    smtpPort: optional("SMTP_PORT", "587"),
    smtpUser: optional("SMTP_USER"),
    smtpPassword: optional("SMTP_PASSWORD"),

    appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    /** Days within which a repeat application to the same job is flagged. */
    duplicateWindowDays: Number(optional("DUPLICATE_APPLICATION_WINDOW_DAYS", "30")),
    rateLimitPerHour: Number(optional("RATE_LIMIT_APPLICATIONS_PER_HOUR", "5")),
  };
}

/** True when storage/email are configured; lets features degrade gracefully. */
export const isStorageConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
