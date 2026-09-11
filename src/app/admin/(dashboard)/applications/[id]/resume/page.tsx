import Link from "next/link";
import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { requireApplication, candidateScope } from "@/lib/ats/access";
import { getApplicationDetail } from "@/lib/services/applications";
import { ResumeViewer } from "@/components/admin/ResumeViewer";
import { AdminHeader, adminButtonSecondary } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, app } = await requireApplication(id);
  const detail = await getApplicationDetail(id);
  if (!detail?.resume) notFound();
  const [previous, next] = await Promise.all([
    db.select({ id: applications.id }).from(applications).where(and(candidateScope(admin), eq(applications.jobId, app.jobId), lt(applications.sequence, app.sequence))).orderBy(desc(applications.sequence)).limit(1),
    db.select({ id: applications.id }).from(applications).where(and(candidateScope(admin), eq(applications.jobId, app.jobId), gt(applications.sequence, app.sequence))).orderBy(asc(applications.sequence)).limit(1),
  ]);
  return <><AdminHeader title={`${app.firstName} ${app.lastName} · Resume`} description={detail.job.title} /><div className="space-y-5 p-5 sm:p-8"><nav className="flex flex-wrap gap-3" aria-label="Resume navigation"><Link className={adminButtonSecondary} href={`/admin/applications/${id}`}>Candidate profile</Link>{previous[0] && <Link className={adminButtonSecondary} href={`/admin/applications/${previous[0].id}/resume`}>Previous candidate</Link>}{next[0] && <Link className={adminButtonSecondary} href={`/admin/applications/${next[0].id}/resume`}>Next candidate</Link>}</nav><ResumeViewer id={id} pdf={detail.resume.mimeType === "application/pdf"} /></div></>;
}
