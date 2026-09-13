import { z } from "zod";
import { employmentTypeEnum, remoteTypeEnum } from "@/db/schema";

/** Dollars in from the form, cents out for storage — the same boundary
 *  conversion offers/validation.ts performs. */
const dollarsToCents = z.preprocess(
  v => (v === "" || v === null ? undefined : v),
  z.coerce.number().nonnegative().max(21_474_836.47)
    .transform(dollars => Math.round(dollars * 100)).optional(),
);

const optionalText = (max: number) =>
  z.preprocess(v => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional());

export const promotionInputSchema = z.object({
  employeeId: z.uuid(),

  // The new state. Title and department are always written — the form
  // pre-fills them with the current values, so "unchanged" is a legitimate
  // answer for any single field as long as something else moved.
  jobTitle: z.string().trim().min(1).max(200),
  department: z.string().trim().min(1).max(120),
  location: optionalText(160),
  employmentType: z.enum(employmentTypeEnum.enumValues),
  remoteType: z.preprocess(v => (v === "" || v === null ? undefined : v),
    z.enum(remoteTypeEnum.enumValues).optional()),
  managerId: z.preprocess(v => (v === "" || v === null ? undefined : v), z.uuid().optional()),

  effectiveDate: z.coerce.date(),
  expirationDate: z.coerce.date(),

  annualSalaryCents: dollarsToCents,
  hourlyRateCents: dollarsToCents,
  bonusCents: dollarsToCents,
  otherCompensation: optionalText(2000),
  benefitsSummary: optionalText(4000),
  ptoSummary: optionalText(2000),
  additionalTerms: optionalText(4000),

  templateId: z.preprocess(v => (v === "" || v === null ? undefined : v), z.uuid().optional()),
})
  .refine(v => !(v.annualSalaryCents != null && v.hourlyRateCents != null), {
    message: "Enter a new annual salary or a new hourly rate, not both.",
    path: ["hourlyRateCents"],
  })
  // The employee must have a real window in which to sign. Unlike an offer —
  // where expiry must precede the start date — a promotion's signing deadline
  // may legitimately fall after the effective date for a backdated change, so
  // the only rule is that it is not in the past.
  .refine(v => v.expirationDate.getTime() > Date.now() - 86_400_000, {
    message: "The signing deadline cannot be in the past.",
    path: ["expirationDate"],
  });

export type PromotionInput = z.infer<typeof promotionInputSchema>;

export const promotionDeclineSchema = z.object({
  reason: optionalText(400),
});

export const promotionAcceptSchema = z.object({
  legalName: z.string().trim().min(2, "Enter your full legal name.").max(200),
  consent: z.literal("on", { error: "You must consent to sign electronically." }),
});
