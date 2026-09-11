/**
 * Invoice arithmetic. Pure, integer-only, and the single authority for how
 * an invoice's totals are derived.
 *
 * Every amount is in cents and every quantity in thousandths of a unit, so
 * nothing here uses floating point. The one place rounding is unavoidable —
 * quantity x rate, and percentage tax — rounds half away from zero at the
 * cent, which is what an invoice reader expects and what makes the column
 * add up to the printed total.
 */

/** Rounds half away from zero. Math.round() biases positives upward and
 *  negatives toward zero, which would make a credit line off by a cent. */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** quantity (thousandths) x rate (cents) -> amount (cents). */
export function lineAmountCents(quantityMilli: number, rateCents: number): number {
  return roundHalfAwayFromZero((quantityMilli * rateCents) / 1000);
}

export type TotalsInput = {
  items: { quantityMilli: number; rateCents: number }[];
  discountCents?: number;
  taxRateBasisPoints?: number;
  additionalChargesCents?: number;
  amountPaidCents?: number;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  additionalChargesCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
};

/**
 * Recomputes every total from the line items. Tax applies to the discounted
 * subtotal (discount before tax), which is the ordinary treatment and keeps
 * the printed arithmetic checkable by hand:
 *   subtotal - discount + tax + additional = total
 */
export function computeTotals(input: TotalsInput): Totals {
  const subtotalCents = input.items.reduce(
    (sum, item) => sum + lineAmountCents(item.quantityMilli, item.rateCents),
    0,
  );
  // A discount may not exceed the subtotal; clamping here means no caller can
  // produce a negative invoice by over-discounting.
  const discountCents = Math.min(Math.max(0, input.discountCents ?? 0), subtotalCents);
  const taxable = subtotalCents - discountCents;
  const taxCents = roundHalfAwayFromZero((taxable * Math.max(0, input.taxRateBasisPoints ?? 0)) / 10_000);
  const additionalChargesCents = Math.max(0, input.additionalChargesCents ?? 0);
  const totalCents = taxable + taxCents + additionalChargesCents;
  const amountPaidCents = Math.max(0, input.amountPaidCents ?? 0);
  return {
    subtotalCents,
    discountCents,
    taxCents,
    additionalChargesCents,
    totalCents,
    amountPaidCents,
    balanceDueCents: totalCents - amountPaidCents,
  };
}

/**
 * The status implied by the money and the calendar. Kept separate from the
 * stored status because OVERDUE is a derived state: an invoice becomes
 * overdue purely by the date passing, with nobody touching the record. VOID
 * and DRAFT are administrative and always win.
 */
export function derivedInvoiceStatus(invoice: {
  status: string;
  dueDate: Date;
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
}, now: Date = new Date()): string {
  // Administrative states always win: a void invoice is never "overdue", and
  // an unsent draft is not chasing anybody for money.
  if (invoice.status === "VOID" || invoice.status === "DRAFT") return invoice.status;
  if (invoice.balanceDueCents <= 0 && invoice.totalCents > 0) return "PAID";
  // Compare against end of the due day: an invoice due today is not late today.
  const endOfDue = new Date(invoice.dueDate);
  endOfDue.setUTCHours(23, 59, 59, 999);
  if (invoice.balanceDueCents > 0 && endOfDue < now) return "OVERDUE";
  if (invoice.amountPaidCents > 0) return "PARTIALLY_PAID";
  return invoice.status;
}

/** Cents -> "$25,000.50". Exact to the cent, unlike the recruiting-side
 *  formatCurrency() which deliberately drops them for compact stat tiles. */
export function formatMoney(cents: number, currency = "USD"): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "1.5" for display from thousandths. Trims trailing zeros. */
export function formatQuantity(quantityMilli: number): string {
  return String(quantityMilli / 1000);
}

/** Parses a user-entered dollar amount into cents without float drift. */
export function parseDollarsToCents(input: string | number): number | null {
  const text = String(input).trim().replace(/[$,\s]/g, "");
  if (!text || !/^-?\d*(\.\d{0,2})?$/.test(text)) return null;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0").slice(0, 2) || "0");
  return negative ? -cents : cents;
}

/** Parses a user-entered quantity into thousandths without float drift. */
export function parseQuantityToMilli(input: string | number): number | null {
  const text = String(input).trim();
  if (!text || !/^\d*(\.\d{0,3})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole || "0") * 1000 + Number(fraction.padEnd(3, "0").slice(0, 3) || "0");
}
