/**
 * The post-application confirmation.
 *
 * These assert intent that is easy to undo by accident: the page must stop
 * asking the visitor to apply once they have, and must not show them a
 * reference number they cannot use.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync(
  new URL("../src/components/applications/ApplyClient.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../src/app/(site)/careers/[slug]/apply/page.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("application confirmation", () => {
  it("does not show the applicant a reference number", () => {
    // It is assigned and stored — recruiters use it — but the applicant has no
    // use for it and cannot act on it, and it was the widest element on an
    // otherwise calm screen.
    expect(client).not.toMatch(/Application reference/i);
    expect(client).not.toMatch(/\breference\b/);
  });

  it("thanks the applicant and sets expectations", () => {
    expect(client).toContain("Thanks for applying");
    // Whitespace-normalised: the sentence wraps across lines in JSX.
    const flat = client.replace(/\s+/g, " ");
    expect(flat).toMatch(/recruiting team reads every submission/);
    expect(client).toMatch(/Good luck/);
  });

  it("hides the apply chrome once the application is in", () => {
    // Leaving "Apply for <role>" and "Back to position details" up asked the
    // visitor to apply for a job they had just applied for, and pushed the
    // confirmation below the fold.
    expect(client).toContain("data-application-submitted");
    expect(page).toContain("apply-chrome");
    expect(css).toContain('[data-application-submitted="true"] .apply-chrome');
  });

  it("flattens the panel so the confirmation is not a card inside a card", () => {
    expect(page).toContain("apply-panel");
    expect(css).toMatch(/\.apply-panel\s*\{[^}]*border-color:\s*transparent/);
  });

  it("returns the reader to the top and moves focus to the heading", () => {
    // The form was long; the confirmation is short. Without this the visitor
    // stays scrolled to wherever the submit button was.
    expect(client).toContain("window.scrollTo");
    expect(client).toMatch(/heading\.current\?\.focus\(\)/);
    expect(client).toContain("tabIndex={-1}");
  });
});
