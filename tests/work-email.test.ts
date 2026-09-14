/**
 * The fixed work-email domain on sign-in and admin creation.
 *
 * The convenience lives in the form; the contract behind it is unchanged. What
 * these guard is that the two stay in step — a form that only produces
 * @sohumsystems.com addresses beside a schema that accepts any domain would
 * let someone create an account that can never sign in.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contact } from "@/lib/site";
import { createAdminSchema, loginSchema } from "@/lib/validation/schemas";

const field = readFileSync(
  new URL("../src/components/admin/WorkEmailField.tsx", import.meta.url),
  "utf8",
);
const login = readFileSync(
  new URL("../src/components/admin/LoginForm.tsx", import.meta.url),
  "utf8",
);

describe("work email field", () => {
  it("renders the domain as text, not an editable control", () => {
    // A disabled input can still be revealed by dev tools and submitted; a
    // span cannot be edited, cleared, or tabbed into at all.
    expect(field).toMatch(/<span\s+id=\{`\$\{id\}-domain`\}/);
    expect(field).not.toMatch(/<input[^>]*disabled[^>]*domain/i);
    expect(field).toContain("select-none");
  });

  it("submits a complete address through a hidden field", () => {
    // The server contract is untouched: loginSchema still receives a full
    // email and still validates it.
    expect(field).toMatch(/type="hidden"\s+name=\{name\}/);
    expect(field).toContain("`${username}${DOMAIN}`");
  });

  it("refuses a typed @ rather than silently swallowing it", () => {
    // Stripping it per keystroke would turn "name@sohumsystems.com" into
    // "namesohumsystems.com" — almost right and completely wrong.
    expect(field).toMatch(/if \(e\.key === "@"\) e\.preventDefault\(\)/);
  });

  it("takes the local part when a whole address is pasted", () => {
    expect(field).toContain('split("@")[0]');
  });

  it("is used by the sign-in form", () => {
    expect(login).toContain("WorkEmailField");
    // The old free-text email input is gone.
    expect(login).not.toMatch(/name="email"\s+type="email"/);
  });
});

describe("company domain enforcement", () => {
  const valid = {
    name: "Priya Raghavan",
    role: "ADMIN" as const,
    password: "Str0ng-Passphrase!",
    confirmPassword: "Str0ng-Passphrase!",
  };

  it("accepts a company address when creating an admin", () => {
    const r = createAdminSchema.safeParse({ ...valid, email: `priya@${contact.emailDomain}` });
    expect(r.success).toBe(true);
  });

  it("refuses an outside domain, so the account cannot be locked out on creation", () => {
    const r = createAdminSchema.safeParse({ ...valid, email: "priya@gmail.com" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some(i => /@sohumsystems\.com/.test(i.message))).toBe(true);
    }
  });

  it("still validates the assembled address on sign-in", () => {
    expect(loginSchema.safeParse({ email: `priya@${contact.emailDomain}`, password: "x" }).success).toBe(true);
    // A blank username submits an empty string, which must not pass.
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
  });
});
