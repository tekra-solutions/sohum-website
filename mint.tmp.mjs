import { SignJWT } from "jose";
import postgres from "postgres";
const sql = postgres(process.env.DIRECT_DATABASE_URL, { connect_timeout: 10, prepare: false });
const [a] = await sql`select id, role from admins limit 1`;
await sql.end();
const token = await new SignJWT({ sub: a.id })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("28800s")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
console.log(token);
console.error("role:", a.role);
