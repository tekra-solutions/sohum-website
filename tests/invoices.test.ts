import { describe, expect, it } from "vitest";
import {
  computeTotals, lineAmountCents, roundHalfAwayFromZero, derivedInvoiceStatus,
  formatMoney, formatQuantity, parseDollarsToCents, parseQuantityToMilli,
} from "@/lib/invoices/money";

describe("invoice arithmetic", () => {
  it("multiplies quantity by rate without floating point drift", () => {
    // 0.1 + 0.2 style errors must never reach an invoice line.
    expect(lineAmountCents(1000, 10)).toBe(10);          // 1 x $0.10
    expect(lineAmountCents(3000, 10)).toBe(30);          // 3 x $0.10 = $0.30 exactly
    expect(lineAmountCents(1500, 20000)).toBe(30000);    // 1.5h x $200 = $300
    expect(lineAmountCents(1, 1)).toBe(0);               // 0.001 x $0.01 rounds to 0
    expect(lineAmountCents(40000, 17550)).toBe(702000);  // 40h x $175.50 = $7,020
  });

  it("rounds half away from zero rather than biasing one direction", () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it("derives totals so the printed column adds up", () => {
    const t = computeTotals({
      items: [
        { quantityMilli: 40000, rateCents: 17550 },  // $7,020.00
        { quantityMilli: 10000, rateCents: 20000 },  // $2,000.00
        { quantityMilli: 2500, rateCents: 12000 },   //   $300.00
      ],
    });
    expect(t.subtotalCents).toBe(932000);
    expect(t.totalCents).toBe(932000);
    expect(t.balanceDueCents).toBe(932000);
    expect(formatMoney(t.totalCents)).toBe("$9,320.00");
  });

  it("applies discount before tax and keeps the identity subtotal-discount+tax+extras=total", () => {
    const t = computeTotals({
      items: [{ quantityMilli: 1000, rateCents: 1000000 }], // $10,000
      discountCents: 50000,            // -$500
      taxRateBasisPoints: 825,         // 8.25% of $9,500 = $783.75
      additionalChargesCents: 12500,   // +$125
    });
    expect(t.subtotalCents).toBe(1000000);
    expect(t.discountCents).toBe(50000);
    expect(t.taxCents).toBe(78375);
    expect(t.totalCents).toBe(1000000 - 50000 + 78375 + 12500);
    expect(t.totalCents).toBe(1040875);
  });

  it("never lets a discount drive the invoice negative", () => {
    const t = computeTotals({ items: [{ quantityMilli: 1000, rateCents: 10000 }], discountCents: 999999 });
    expect(t.discountCents).toBe(10000);
    expect(t.totalCents).toBe(0);
    expect(t.totalCents).toBeGreaterThanOrEqual(0);
  });

  it("tracks balance across partial payments and reaches exactly zero", () => {
    const items = [{ quantityMilli: 1000, rateCents: 2500000 }]; // $25,000
    expect(computeTotals({ items }).balanceDueCents).toBe(2500000);
    expect(computeTotals({ items, amountPaidCents: 1000000 }).balanceDueCents).toBe(1500000);
    const final = computeTotals({ items, amountPaidCents: 2500000 });
    expect(final.balanceDueCents).toBe(0);
    expect(formatMoney(final.balanceDueCents)).toBe("$0.00");
  });

  it("handles an invoice larger than the 32-bit cent ceiling", () => {
    // $50,000,000 in cents is 5_000_000_000 — past the ~$21.5M that a
    // 32-bit integer column could hold, which is why money is bigint here.
    const fiftyMillionInCents = 50_000_000 * 100;
    const t = computeTotals({ items: [{ quantityMilli: 1000, rateCents: fiftyMillionInCents }] });
    expect(t.totalCents).toBe(5_000_000_000);
    expect(t.totalCents).toBeGreaterThan(2_147_483_647);
    expect(formatMoney(t.totalCents)).toBe("$50,000,000.00");
  });
});

describe("derived invoice status", () => {
  const base = { totalCents: 100000, amountPaidCents: 0, balanceDueCents: 100000 };
  const past = new Date("2026-01-01T00:00:00Z");
  const future = new Date("2099-01-01T00:00:00Z");
  const now = new Date("2026-06-01T12:00:00Z");

  it("marks an unpaid invoice past its due date as overdue", () => {
    expect(derivedInvoiceStatus({ ...base, status: "SENT", dueDate: past }, now)).toBe("OVERDUE");
  });
  it("does not call an invoice due today late", () => {
    const today = new Date("2026-06-01T00:00:00Z");
    expect(derivedInvoiceStatus({ ...base, status: "SENT", dueDate: today }, now)).toBe("SENT");
  });
  it("reports paid once the balance clears, even past the due date", () => {
    expect(derivedInvoiceStatus(
      { status: "SENT", dueDate: past, totalCents: 100000, amountPaidCents: 100000, balanceDueCents: 0 }, now,
    )).toBe("PAID");
  });
  it("reports partially paid when money has arrived but a balance remains", () => {
    expect(derivedInvoiceStatus(
      { status: "SENT", dueDate: future, totalCents: 100000, amountPaidCents: 40000, balanceDueCents: 60000 }, now,
    )).toBe("PARTIALLY_PAID");
  });
  it("never overrides void or draft", () => {
    expect(derivedInvoiceStatus({ ...base, status: "VOID", dueDate: past }, now)).toBe("VOID");
    expect(derivedInvoiceStatus({ ...base, status: "DRAFT", dueDate: past }, now)).toBe("DRAFT");
  });
});

describe("money and quantity parsing", () => {
  it("parses dollar input to exact cents", () => {
    expect(parseDollarsToCents("25000")).toBe(2500000);
    expect(parseDollarsToCents("25,000.50")).toBe(2500050);
    expect(parseDollarsToCents("$1,234.05")).toBe(123405);
    expect(parseDollarsToCents("0.1")).toBe(10);
    expect(parseDollarsToCents(".5")).toBe(50);
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
    expect(parseDollarsToCents("1.234")).toBeNull();  // more precision than cents
  });
  it("parses quantity input to exact thousandths", () => {
    expect(parseQuantityToMilli("1")).toBe(1000);
    expect(parseQuantityToMilli("1.5")).toBe(1500);
    expect(parseQuantityToMilli("0.25")).toBe(250);
    expect(parseQuantityToMilli("40")).toBe(40000);
    expect(parseQuantityToMilli("1.2345")).toBeNull();
    expect(parseQuantityToMilli("-1")).toBeNull();
  });
  it("formats money to the cent and quantity without trailing zeros", () => {
    expect(formatMoney(2500050)).toBe("$25,000.50");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatQuantity(1500)).toBe("1.5");
    expect(formatQuantity(40000)).toBe("40");
  });
  it("round-trips parse -> compute -> format without drift", () => {
    const qty = parseQuantityToMilli("1.5")!;
    const rate = parseDollarsToCents("133.33")!;
    expect(formatMoney(lineAmountCents(qty, rate))).toBe("$200.00");
  });
});
