import { z } from "zod";
import { validateOfferTemplate } from "./variables";
import { employmentTypeEnum, remoteTypeEnum } from "@/db/schema";

export const offerTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(["FULL_TIME", "CONTRACT", "REMOTE", "INTERNSHIP", "CUSTOM"]),
  subject: z.string().trim().min(1).max(300).refine(v => !/[\r\n]/.test(v)).refine(validateOfferTemplate, "Unknown or invalid variable"),
  bodyHtml: z.string().trim().min(1).max(20000).refine(validateOfferTemplate, "Unknown or invalid variable"),
  // Pages 2 and 3 of the offer document. Optional: when a template leaves
  // them empty the document says so rather than substituting invented terms.
  termsHtml: z.preprocess(v => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(20000).refine(validateOfferTemplate, "Unknown or invalid variable").nullable().optional()),
  acknowledgementsHtml: z.preprocess(v => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(20000).refine(validateOfferTemplate, "Unknown or invalid variable").nullable().optional()),
  isActive: z.boolean(),
});

/**
 * Dollars in from the form, cents out for storage — the schema does the
 * conversion so every caller works in cents from here on.
 */
const dollarsToCents = z.preprocess(v => v === "" || v === null ? undefined : v,
  z.coerce.number().nonnegative().max(21_474_836.47).transform(dollars => Math.round(dollars * 100)).optional());

export const offerVersionInputSchema = z.object({
  jobTitle: z.string().trim().min(1).max(200),
  department: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(160),
  employmentType: z.enum(employmentTypeEnum.enumValues),
  remoteType: z.enum(remoteTypeEnum.enumValues),
  hiringManagerName: z.string().trim().max(160).optional(),
  reportsTo: z.string().trim().max(160).optional(),

  startDate: z.coerce.date(),
  expirationDate: z.coerce.date(),
  annualSalaryCents: dollarsToCents,
  hourlyRateCents: dollarsToCents,
  bonusCents: dollarsToCents,
  signOnBonusCents: dollarsToCents,
  otherCompensation: z.string().trim().max(2000).optional(),
  benefitsSummary: z.string().trim().max(4000).optional(),
  ptoSummary: z.string().trim().max(2000).optional(),
  workLocation: z.string().trim().max(300).optional(),
  additionalTerms: z.string().trim().max(4000).optional(),

  templateId: z.preprocess(v => v === "" || v === null ? undefined : v, z.uuid().optional()),
}).refine(v => v.expirationDate > new Date(0) && v.expirationDate <= v.startDate, {
  message: "The offer must expire on or before the start date — a candidate cannot still be deciding after starting.",
  path: ["expirationDate"],
});

export const otpVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const declineReasons = [
  "ACCEPTED_ANOTHER", "COMPENSATION", "LOCATION", "TIMING", "OTHER",
] as const;

export const declineSchema = z.object({
  reason: z.preprocess(v => v === "" ? undefined : v, z.enum(declineReasons).optional()),
  note: z.string().trim().max(1000).optional(),
});

export const acceptSchema = z.object({
  legalName: z.string().trim().min(1).max(200),
  confirmed: z.literal("1", { message: "You must confirm acceptance to continue" }),
  // Consent to sign electronically is recorded separately from the acceptance
  // itself: it is what the signature's validity rests on, so it is its own
  // deliberate checkbox rather than being implied by accepting.
  esignConsent: z.literal("1", {
    message: "You must consent to use an electronic signature to continue",
  }),
  /** The typed signature, which must match the legal name the candidate entered. */
  signature: z.string().trim().min(1, "Type your full legal name to sign").max(200),
}).refine(v => normalizeName(v.signature) === normalizeName(v.legalName), {
  message: "Your typed signature must match your full legal name",
  path: ["signature"],
});

/** Compare names ignoring case and internal whitespace runs, nothing more. */
function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Extending an offer moves only its expiration date. */
export const extendOfferSchema = z.object({
  expirationDate: z.coerce.date(),
});
