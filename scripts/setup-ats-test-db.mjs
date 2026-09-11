/** Isolated local PostgreSQL fixture; never connects to production. */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
const url = process.env.ATS_TEST_DATABASE_URL;
if (!url) throw new Error("Set ATS_TEST_DATABASE_URL to a local sohum_ats_test_* database.");
const parsed = new URL(url);
if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !parsed.pathname.startsWith("/sohum_ats_test_")) throw new Error("Refusing non-test database.");
const root = postgres(new URL("/postgres", parsed).href, { max: 1 });
const name = parsed.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(name)) throw new Error("Invalid database name");
const exists = await root`select 1 from pg_database where datname = ${name}`;
if (exists.length) throw new Error("Test database already exists; use a fresh name.");
await root.unsafe(`CREATE DATABASE "${name}"`); await root.end();
const db = postgres(url, { max: 1 });
for (const file of ["drizzle/0000_futuristic_nitro.sql", "drizzle/0001_steep_mikhail_rasputin.sql"]) await db.unsafe(readFileSync(file,"utf8"));
const password = await bcrypt.hash("Local-ATS-Test-2026!", 10);
for (const [id, role, name] of [["10000000-0000-4000-8000-000000000001","SUPER_ADMIN","Test Admin"],["10000000-0000-4000-8000-000000000002","RECRUITER","Test Recruiter"]]) await db`insert into admins(id,name,email,password_hash,role) values(${id},${name},${role.toLowerCase()+"@sohum.invalid"},${password},${role})`;
await db`insert into jobs(id,title,slug,department,location,description,status) values('20000000-0000-4000-8000-000000000001','Principal Quality Engineer','ats-verification-principal-quality-engineer','Engineering','Kansas City','Local verification job description.','PUBLISHED')`;
await db`insert into applications(id,reference,job_id,first_name,last_name,email,status) values('30000000-0000-4000-8000-000000000001','LOCAL-ATS-1','20000000-0000-4000-8000-000000000001','Jane','Verification','jane@sohum.invalid','REVIEWING')`;
await db`insert into application_events(application_id,from_status,to_status) values('30000000-0000-4000-8000-000000000001','NEW','REVIEWING')`;
await db.begin(async tx => { await tx.unsafe(readFileSync("drizzle/0002_lumpy_centennial.sql","utf8")); });
const [legacy] = await db`select status from applications where id = '30000000-0000-4000-8000-000000000001'`;
if (legacy.status !== "SCREENING") throw new Error("Legacy migration failed");
await db`insert into admins(id,name,email,password_hash,role) values('10000000-0000-4000-8000-000000000003','Test Manager','hiring_manager@sohum.invalid',${password},'HIRING_MANAGER')`;
await db`update applications set assigned_to = '10000000-0000-4000-8000-000000000002',city='Kansas City',years_experience=8,skills='Playwright, Java' where id='30000000-0000-4000-8000-000000000001'`;
await db`insert into job_assignments(job_id,admin_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003')`;
await db`insert into applications(id,reference,job_id,first_name,last_name,email,status) values('30000000-0000-4000-8000-000000000002','LOCAL-ATS-2','20000000-0000-4000-8000-000000000001','Private','Unassigned','unassigned@sohum.invalid','NEW')`;
await db.unsafe(readFileSync("drizzle/0003_quiet_radioactive_man.sql","utf8"));
await db`insert into offer_templates(id,name,category,subject,body_html) values('40000000-0000-4000-8000-000000000001','Full-Time Employee','FULL_TIME','Employment Offer — {{job_title}} — Sohum Systems','<p>Sample content — requires legal review before use.</p><p>We are pleased to offer {{candidate_first_name}} the position of {{job_title}} at {{company_name}}.</p>')`;
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
for (const entry of journal.entries.filter(e => e.idx > 3)) {
  await db.begin(async tx => { await tx.unsafe(readFileSync(`drizzle/${entry.tag}.sql`, "utf8")); });
}
await db.unsafe(readFileSync("drizzle/rls-policies.sql","utf8"));
console.log("Local test database created; legacy stage migration, offer schema and RLS applied.");
await db.end();
