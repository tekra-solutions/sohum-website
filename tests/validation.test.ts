/**
 * Validation is the security boundary for every public write, so these tests
 * assert the rules that keep bad or hostile input out of the database.
 */
import { describe, expect, it } from "vitest";
import {
  applicationInputSchema,
  jobInputSchema,
  loginSchema,
  passwordChangeSchema,
  statusChangeSchema,
  validateResume,
  MAX_RESUME_BYTES,
} from "@/lib/validation/schemas";

const validApplication = {
  jobId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  firstName: "Alex",
  lastName: "Rivera",
  email: "Alex.Rivera@Example.com",
  workAuthorized: "yes",
  sponsorshipRequired: "no",
};

describe("application input", () => {
  it("accepts a minimal valid application and normalises the email", () => {
    const r = applicationInputSchema.safeParse(validApplication);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("alex.rivera@example.com");
  });

  it("coerces yes/no answers to booleans", () => {
    const r = applicationInputSchema.safeParse(validApplication);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.workAuthorized).toBe(true);
      expect(r.data.sponsorshipRequired).toBe(false);
    }
  });

  it("rejects an invalid email", () => {
    const r = applicationInputSchema.safeParse({ ...validApplication, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects a non-uuid job id", () => {
    const r = applicationInputSchema.safeParse({ ...validApplication, jobId: "1" });
    expect(r.success).toBe(false);
  });

  it("requires a first and last name", () => {
    expect(applicationInputSchema.safeParse({ ...validApplication, firstName: "" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validApplication, lastName: " " }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const r = applicationInputSchema.safeParse({ ...validApplication, website: "http://spam.example" });
    expect(r.success).toBe(false);
  });

  it("accepts an empty honeypot", () => {
    expect(applicationInputSchema.safeParse({ ...validApplication, website: "" }).success).toBe(true);
  });

  it("rejects a malformed URL but allows an empty one", () => {
    expect(applicationInputSchema.safeParse({ ...validApplication, linkedinUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validApplication, linkedinUrl: "" }).success).toBe(true);
    expect(applicationInputSchema.safeParse({ ...validApplication, linkedinUrl: "https://linkedin.com/in/x" }).success).toBe(true);
  });

  it("bounds years of experience", () => {
    expect(applicationInputSchema.safeParse({ ...validApplication, yearsExperience: -1 }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validApplication, yearsExperience: 99 }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validApplication, yearsExperience: 8 }).success).toBe(true);
  });
});

describe("resume validation", () => {
  const pdf = { name: "cv.pdf", type: "application/pdf", size: 1024 };

  it("accepts a PDF within the size limit", () => {
    expect(validateResume(pdf).ok).toBe(true);
  });

  it("accepts DOC and DOCX", () => {
    expect(validateResume({ name: "cv.doc", type: "application/msword", size: 2048 }).ok).toBe(true);
    expect(validateResume({
      name: "cv.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 2048,
    }).ok).toBe(true);
  });

  it("rejects a disallowed extension even with a valid MIME type", () => {
    expect(validateResume({ ...pdf, name: "payload.exe" }).ok).toBe(false);
  });

  it("rejects a mismatched MIME type even with a valid extension", () => {
    expect(validateResume({ ...pdf, type: "application/x-msdownload" }).ok).toBe(false);
  });

  it("rejects a file over the limit", () => {
    expect(validateResume({ ...pdf, size: MAX_RESUME_BYTES + 1 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateResume({ ...pdf, size: 0 }).ok).toBe(false);
  });
});

describe("job input", () => {
  const base = {
    title: "Senior Software Engineer",
    department: "Engineering",
    location: "Overland Park, KS",
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "SENIOR",
    description: "We are hiring a senior engineer to work on federal systems.",
    responsibilities: "Build services\nReview code",
    qualifications: "5 years experience",
    preferredQualifications: "",
    skills: "TypeScript\nPostgres",
  };

  it("accepts a valid job and splits textarea lists", () => {
    const r = jobInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.responsibilities).toEqual(["Build services", "Review code"]);
      expect(r.data.skills).toEqual(["TypeScript", "Postgres"]);
      expect(r.data.preferredQualifications).toEqual([]);
    }
  });

  it("rejects an invalid enum value", () => {
    expect(jobInputSchema.safeParse({ ...base, employmentType: "PERMANENT" }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, experienceLevel: "GURU" }).success).toBe(false);
  });

  it("rejects a malformed slug but allows an empty one", () => {
    expect(jobInputSchema.safeParse({ ...base, slug: "Not A Slug" }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, slug: "" }).success).toBe(true);
    expect(jobInputSchema.safeParse({ ...base, slug: "senior-software-engineer" }).success).toBe(true);
  });

  it("requires a title and a description", () => {
    expect(jobInputSchema.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(jobInputSchema.safeParse({ ...base, description: "short" }).success).toBe(false);
  });
});

describe("admin schemas", () => {
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("only allows known application statuses", () => {
    expect(statusChangeSchema.safeParse({ status: "SCREENING" }).success).toBe(true);
    expect(statusChangeSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });

  it("enforces password strength and confirmation", () => {
    const ok = { currentPassword: "old", newPassword: "Str0ngPassphrase", confirmPassword: "Str0ngPassphrase" };
    expect(passwordChangeSchema.safeParse(ok).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ ...ok, newPassword: "short1A", confirmPassword: "short1A" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ ...ok, confirmPassword: "Different0000" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ ...ok, newPassword: "alllowercase1", confirmPassword: "alllowercase1" }).success).toBe(false);
  });
});
