import { z } from "zod";
import { paymentMethods } from "./policy";
import { parseDollarsToCents, parseQuantityToMilli } from "./money";

/** Dollar string/number -> exact cents, rejecting sub-cent precision. */
const dollars = z.preprocess(
  v => (v === "" || v === null || v === undefined ? undefined : v),
  z.union([z.string(), z.number()])
    .transform((v, ctx) => {
      const cents = parseDollarsToCents(v);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Enter an amount like 1250.00" });
        return z.NEVER;
      }
      return cents;
    })
    .optional(),
);

const requiredDollars = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const cents = parseDollarsToCents(v);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter an amount like 1250.00" });
    return z.NEVER;
  }
  return cents;
});

export const clientSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  contactName: z.string().trim().max(160).optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email address").max(255)]).optional(),
  phone: z.string().trim().max(40).optional(),
  billingAddress: z.string().trim().max(2000).optional(),
  agency: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Each line needs a description").max(2000),
  quantityMilli: z.union([z.string(), z.number()]).transform((v, ctx) => {
    const milli = parseQuantityToMilli(v);
    if (milli === null || milli <= 0) {
      ctx.addIssue({ code: "custom", message: "Quantity must be greater than zero" });
      return z.NEVER;
    }
    return milli;
  }),
  rateCents: requiredDollars.refine(c => c >= 0, "Rate cannot be negative"),
  servicePeriod: z.string().trim().max(160).optional(),
  consultantName: z.string().trim().max(160).optional(),
  projectRef: z.string().trim().max(200).optional(),
});

export const invoiceInputSchema = z.object({
  clientId: z.preprocess(v => (v === "" || v === null ? undefined : v), z.uuid().optional()),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  poNumber: z.string().trim().max(120).optional(),
  contractNumber: z.string().trim().max(120).optional(),
  taskOrder: z.string().trim().max(120).optional(),
  projectName: z.string().trim().max(200).optional(),
  periodOfPerformance: z.string().trim().max(160).optional(),
  paymentTerms: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(4000).optional(),
  discountCents: dollars,
  additionalChargesCents: dollars,
  taxRateBasisPoints: z.preprocess(
    v => (v === "" || v === null || v === undefined ? 0 : v),
    z.coerce.number().min(0, "Tax rate cannot be negative").max(10000, "Tax rate cannot exceed 100%"),
  ),
  items: z.array(invoiceItemSchema).min(1, "An invoice needs at least one line item").max(200),
}).refine(v => v.dueDate >= v.invoiceDate, {
  message: "The due date cannot be before the invoice date",
  path: ["dueDate"],
});

export const paymentSchema = z.object({
  amountCents: requiredDollars.refine(c => c > 0, "Payment must be greater than zero"),
  paidOn: z.coerce.date(),
  method: z.enum(paymentMethods),
  reference: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const voidSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to void an invoice").max(1000),
});

export const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string().trim().min(1).max(16).regex(/^[A-Z0-9-]+$/i, "Use letters, numbers or hyphens"),
  defaultPaymentTerms: z.string().trim().min(1).max(120),
  defaultNotes: z.string().trim().max(4000).optional(),
  paymentInstructions: z.string().trim().max(4000).optional(),
  defaultCurrency: z.string().trim().length(3).toUpperCase(),
  defaultTaxRateBasisPoints: z.coerce.number().min(0).max(10000),
  legalName: z.string().trim().max(200).optional(),
  billingAddress: z.string().trim().max(2000).optional(),
  billingEmail: z.union([z.literal(""), z.email().max(255)]).optional(),
  billingPhone: z.string().trim().max(40).optional(),
  taxId: z.string().trim().max(60).optional(),
});

export const sendInvoiceSchema = z.object({
  to: z.email("Enter a valid recipient email address").max(255),
  cc: z.union([z.literal(""), z.email("Enter a valid CC address").max(255)]).optional(),
  subject: z.string().trim().min(1).max(300).refine(v => !/[\r\n]/.test(v), "Invalid subject"),
  message: z.string().trim().max(5000).optional(),
  attachPdf: z.boolean().optional(),
});
