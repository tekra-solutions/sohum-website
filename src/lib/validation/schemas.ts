/**
 * Zod schemas. These are the single source of truth for what the server will
 * accept — client-side validation is a UX convenience layered on top and is
 * never trusted.
 */
import { z } from "zod";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024; // Keep multipart requests below Vercel’s 4.5 MB limit.

export const ALLOWED_RESUME_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_RESUME_EXT = [".pdf", ".doc", ".docx"] as const;

/* ------------------------------------------------------------------- jobs */

export const employmentTypes = ["FULL_TIME","PART_TIME","CONTRACT","TEMPORARY","INTERNSHIP"] as const;
export const remoteTypes = ["ON_SITE","HYBRID","REMOTE"] as const;
export const experienceLevels = ["ENTRY","MID","SENIOR","LEAD","PRINCIPAL"] as const;
export const jobStatuses = ["DRAFT","PENDING_APPROVAL","APPROVED","PUBLISHED","CLOSED","ARCHIVED"] as const;
export const applicationStatuses = ["NEW","SCREENING","SHORTLISTED","INTERVIEW","OFFER","REJECTED","HIRED"] as const;

/** Accepts a textarea of one-per-line items and normalises to a string array. */
const lines = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : v.split("\n"))
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const jobInputSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(220)
    .optional()
    .or(z.literal("")),
  department: z.string().trim().min(1, "Department is required").max(120),
  location: z.string().trim().min(1, "Location is required").max(160),
  employmentType: z.enum(employmentTypes),
  remoteType: z.enum(remoteTypes),
  experienceLevel: z.enum(experienceLevels),
  summary: z.string().trim().max(400).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Description is required"),
  responsibilities: lines,
  qualifications: lines,
  preferredQualifications: lines,
  skills: lines,
  salaryRange: z.string().trim().max(160).optional().or(z.literal("")),
  status: z.enum(jobStatuses).default("DRAFT"),
});

export type JobInput = z.input<typeof jobInputSchema>;

/* ----------------------------------------------------------- applications */

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || /^https?:\/\/.+\..+/.test(v),
    "Enter a full URL starting with http:// or https://",
  );

export const applicationInputSchema = z.object({
  jobId: z.string().uuid("Invalid job"),

  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),

  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  zipCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),

  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  coverLetter: z.string().trim().max(20000).optional().or(z.literal("")),

  workAuthorized: z.union([z.boolean(), z.enum(["yes","no"])]).transform(
    (v) => (typeof v === "boolean" ? v : v === "yes"),
  ),
  sponsorshipRequired: z.union([z.boolean(), z.enum(["yes","no"])]).transform(
    (v) => (typeof v === "boolean" ? v : v === "yes"),
  ),

  source: z.string().trim().max(160).optional().or(z.literal("")),

  /** Honeypot: must stay empty. Bots fill every field they find. */
  website: z.string().max(0, "Rejected").optional().or(z.literal("")),
});

export type ApplicationInput = z.input<typeof applicationInputSchema>;

/* ----------------------------------------------------------------- admin */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const statusChangeSchema = z.object({
  status: z.enum(applicationStatuses),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const notesSchema = z.object({
  internalNotes: z.string().max(20000),
});

export const adminRoles = ["ADMIN", "RECRUITER", "SUPER_ADMIN", "RECRUITING_ADMIN", "HIRING_MANAGER"] as const;
export const employmentStatuses = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

/** Shared password rule so create-admin and password-change cannot drift. */
export const strongPassword = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const createAdminSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(160),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
    role: z.enum(adminRoles),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address");

/** Optional YYYY-MM-DD date from a native date input. */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const employeeInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(120),
    lastName: z.string().trim().min(1, "Last name is required").max(120),
    workEmail: z.string().trim().toLowerCase().email("Enter a valid work email").max(255),
    personalEmail: optionalEmail,
    phone: z.string().trim().max(40).optional().or(z.literal("")),

    jobTitle: z.string().trim().min(1, "Job title is required").max(160),
    department: z.string().trim().min(1, "Department is required").max(120),
    location: z.string().trim().max(160).optional().or(z.literal("")),
    employmentType: z.enum(employmentTypes),
    status: z.enum(employmentStatuses),

    managerId: z.string().uuid().optional().or(z.literal("")),
    startDate: optionalDate,
    endDate: optionalDate,
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || Date.parse(d.endDate) >= Date.parse(d.startDate),
    { message: "End date cannot be before the start date", path: ["endDate"] },
  )
  .refine((d) => d.status !== "TERMINATED" || Boolean(d.endDate), {
    message: "An end date is required when the status is Terminated",
    path: ["endDate"],
  });

export type EmployeeInput = z.input<typeof employeeInputSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Validates an uploaded resume by extension, MIME type and size. */
export function validateResume(file: { name: string; type: string; size: number }) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_RESUME_EXT.includes(ext as (typeof ALLOWED_RESUME_EXT)[number])) {
    return { ok: false as const, error: "Resume must be a PDF, DOC or DOCX file." };
  }
  if (!ALLOWED_RESUME_MIME.includes(file.type as (typeof ALLOWED_RESUME_MIME)[number])) {
    return { ok: false as const, error: "That file type is not supported." };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false as const, error: "Resume must be 4 MB or smaller." };
  }
  if (file.size === 0) {
    return { ok: false as const, error: "That file appears to be empty." };
  }
  return { ok: true as const };
}
