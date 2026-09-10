import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText, Mail, MapPin, Phone } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/ui";
import { getApplicationDetail } from "@/lib/services/applications";
import { changeStatusAction, saveNotesAction } from "@/lib/services/application-actions";
import { applicationStatusLabel, formatDateTime, formatFileSize } from "@/lib/format";
import { applicationStatuses } from "@/lib/validation/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-paper-200 py-3 last:border-0">
      <dt className="text-[0.8125rem] text-graphite-500">{label}</dt>
      <dd className="text-right text-[0.9375rem] text-ink-900">{children}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const app = await getApplicationDetail(id);
  if (!app) notFound();

  // Opening an applicant record is itself an auditable access.
  await audit({
    adminId: admin.id,
    action: "ADMIN_VIEWED_APPLICATION",
    entityType: "application",
    entityId: id,
    metadata: { reference: app.reference },
  });

  const name = `${app.firstName} ${app.lastName}`;
  const locationParts = [app.city, app.state, app.zipCode, app.country].filter(Boolean);

  return (
    <>
      <AdminHeader
        title={name}
        description={`${app.job.title} · ${app.reference}`}
        action={<StatusPill status={app.status} label={applicationStatusLabel[app.status]} />}
      />

      <div className="p-5 sm:p-8">
        <Link href="/admin/applications" className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-graphite-700 hover:text-ink-900">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All applications
        </Link>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* ---------------------------------------------------- main column */}
          <div className="space-y-5">
            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Applicant</h2>
              <dl className="mt-4">
                <Row label="Name">{name}</Row>
                <Row label="Email">
                  <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                    <Mail className="size-3.5 text-graphite-400" aria-hidden="true" />
                    {app.email}
                  </a>
                </Row>
                {app.phone && (
                  <Row label="Phone">
                    <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 text-graphite-400" aria-hidden="true" />
                      {app.phone}
                    </a>
                  </Row>
                )}
                {locationParts.length > 0 && (
                  <Row label="Location">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-graphite-400" aria-hidden="true" />
                      {[app.address, ...locationParts].filter(Boolean).join(", ")}
                    </span>
                  </Row>
                )}
                {app.yearsExperience != null && <Row label="Experience">{app.yearsExperience} years</Row>}
                {app.linkedinUrl && (
                  <Row label="LinkedIn">
                    <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                      {app.linkedinUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </Row>
                )}
                {app.portfolioUrl && (
                  <Row label="Portfolio">
                    <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                      {app.portfolioUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </Row>
                )}
                <Row label="Work authorized">{app.workAuthorized ? "Yes" : "No"}</Row>
                <Row label="Needs sponsorship">{app.sponsorshipRequired ? "Yes" : "No"}</Row>
                {app.source && <Row label="Heard about us via">{app.source}</Row>}
                <Row label="Applied">{formatDateTime(app.createdAt)}</Row>
              </dl>
            </section>

            {/* ---- Resume ---- */}
            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Resume</h2>
              {app.resume ? (
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <FileText className="size-5 shrink-0 text-flame-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-ink-900">{app.resume.originalFilename}</p>
                    <p className="text-[0.8125rem] text-graphite-600">{formatFileSize(app.resume.fileSize)}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/api/admin/applications/${app.id}/resume`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-[3px] border border-paper-300 px-4 py-2.5 text-[0.875rem] font-medium text-ink-900 hover:border-ink-500"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      View
                    </a>
                    <a
                      href={`/api/admin/applications/${app.id}/resume?download=1`}
                      className="inline-flex items-center gap-2 rounded-[3px] bg-ink-900 px-4 py-2.5 text-[0.875rem] font-medium text-white hover:bg-ink-700"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[0.9375rem] text-graphite-600">No resume on file.</p>
              )}
            </section>

            {app.coverLetter && (
              <section className="rounded-[4px] border border-paper-300 bg-white p-6">
                <h2 className="text-[1.0625rem] font-medium text-ink-900">Cover letter</h2>
                <div className="mt-4 space-y-3">
                  {app.coverLetter.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} className="text-[0.9375rem] leading-[1.7] text-graphite-700">{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* ---- Internal notes ---- */}
            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Internal notes</h2>
              <p className="mt-1.5 text-[0.875rem] text-graphite-600">Visible to recruiting admins only.</p>
              <form action={saveNotesAction} className="mt-4">
                <input type="hidden" name="id" value={app.id} />
                <label htmlFor="internalNotes" className="sr-only">Internal notes</label>
                <textarea
                  id="internalNotes"
                  name="internalNotes"
                  rows={5}
                  defaultValue={app.internalNotes ?? ""}
                  className="w-full resize-y rounded-[3px] border border-paper-300 px-3.5 py-2.5 text-[0.9375rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
                />
                <button type="submit" className="mt-3 rounded-[3px] bg-ink-900 px-5 py-2.5 text-[0.875rem] font-medium text-white hover:bg-ink-700">
                  Save notes
                </button>
              </form>
            </section>
          </div>

          {/* ---------------------------------------------------- side column */}
          <div className="space-y-5">
            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Status</h2>
              <form action={changeStatusAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={app.id} />
                <div>
                  <label htmlFor="status" className="sr-only">Status</label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={app.status}
                    className="w-full rounded-[3px] border border-paper-300 bg-white px-3.5 py-2.5 text-[0.9375rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
                  >
                    {applicationStatuses.map((s) => (
                      <option key={s} value={s}>{applicationStatusLabel[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="note" className="block text-[0.8125rem] text-graphite-600">Note (optional)</label>
                  <input
                    id="note"
                    name="note"
                    className="mt-1.5 w-full rounded-[3px] border border-paper-300 px-3.5 py-2.5 text-[0.875rem] focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/30"
                  />
                </div>
                <button type="submit" className="w-full rounded-[3px] bg-ink-900 px-5 py-2.5 text-[0.875rem] font-medium text-white hover:bg-ink-700">
                  Update status
                </button>
              </form>
            </section>

            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Timeline</h2>
              <ol className="mt-4 space-y-4">
                {app.events.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-flame-500" />
                    <div>
                      <p className="text-[0.875rem] font-medium text-ink-900">
                        {ev.fromStatus
                          ? `${applicationStatusLabel[ev.fromStatus]} → ${applicationStatusLabel[ev.toStatus]}`
                          : applicationStatusLabel[ev.toStatus]}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-graphite-600">{formatDateTime(ev.createdAt)}</p>
                      {ev.note && <p className="mt-1 text-[0.875rem] text-graphite-700">{ev.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-[4px] border border-paper-300 bg-white p-6">
              <h2 className="text-[1.0625rem] font-medium text-ink-900">Position</h2>
              <p className="mt-3 text-[0.9375rem] font-medium text-ink-900">{app.job.title}</p>
              <p className="mt-1 text-[0.875rem] text-graphite-600">{app.job.department} · {app.job.location}</p>
              <Link href={`/admin/jobs/${app.job.id}`} className="mt-4 inline-block text-[0.875rem] font-medium text-ink-900 underline decoration-paper-300 underline-offset-4 hover:decoration-flame-500">
                Open job
              </Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
