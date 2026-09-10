/**
 * Interactive first-admin creation.
 *
 *   npm run create-admin
 *
 * Deliberately interactive and never seeded with a default password, so no
 * known credential ever exists in the repository or in a fresh deployment.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";

const MIN_PASSWORD = 12;

function assertStrong(pw: string) {
  const problems: string[] = [];
  if (pw.length < MIN_PASSWORD) problems.push(`at least ${MIN_PASSWORD} characters`);
  if (!/[a-z]/.test(pw)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(pw)) problems.push("an uppercase letter");
  if (!/[0-9]/.test(pw)) problems.push("a number");
  return problems;
}

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("\n  DATABASE_URL is not set. Copy .env.example to .env.local first.\n");
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const sqlClient = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sqlClient, { schema });

  try {
    console.log("\n  Create a Sohum Systems admin account\n  ------------------------------------\n");

    const name = (await rl.question("  Name:     ")).trim();
    if (!name) throw new Error("Name is required");

    const email = (await rl.question("  Email:    ")).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");

    const existing = await db.query.admins.findFirst({
      where: sql`lower(${schema.admins.email}) = ${email}`,
      columns: { id: true },
    });
    if (existing) throw new Error(`An admin with ${email} already exists`);

    const password = await rl.question("  Password: ");
    const problems = assertStrong(password);
    if (problems.length) throw new Error(`Password needs ${problems.join(", ")}`);

    const confirm = await rl.question("  Confirm:  ");
    if (password !== confirm) throw new Error("Passwords do not match");

    const passwordHash = await bcrypt.hash(password, 12);
    const [row] = await db
      .insert(schema.admins)
      .values({ name, email, passwordHash, role: "SUPER_ADMIN" })
      .returning({ id: schema.admins.id, email: schema.admins.email });

    console.log(`\n  ✓ Created admin ${row!.email}\n    Sign in at /admin/login\n`);
  } catch (err) {
    console.error(`\n  ✗ ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await sqlClient.end({ timeout: 5 });
  }
}

void main();
