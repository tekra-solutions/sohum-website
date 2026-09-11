import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, jobViews } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 400 });
  const limited = await rateLimit({ key: `job-view:${id}:${clientIp(request.headers)}`, limit: 1, windowMs: 30*60_000 });
  if (!limited.ok) return new Response(null, { status: 204 });
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, id), eq(jobs.status, "PUBLISHED"))).limit(1);
  if (!job) return new Response(null, { status: 404 });
  await db.insert(jobViews).values({ jobId: id, day: new Date().toISOString().slice(0,10), views: 1 }).onConflictDoUpdate({ target: [jobViews.jobId, jobViews.day], set: { views: sql`${jobViews.views} + 1` } });
  return new Response(null, { status: 204 });
}
