import { CandidateWorkspace } from "@/components/admin/CandidateWorkspace";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText, Mail, MapPin, Phone } from "lucide-react";
import { AdminHeader, Card, PageBody, StatusPill, adminButton, adminButtonSecondary } from "@/components/admin/ui";
import { t } from "@/components/admin/form";
import { getApplicationDetail, applicationSummary } from "@/lib/services/applications";
import { applicationStatusLabel, offerStatusLabel, formatDateTime, formatFileSize, shortDate } from "@/lib/format";
import { permits } from "@/lib/ats/policy";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Application" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-b border-paper-200 py-2 last:border-0">
      <dt className={`${t.hint} text-graphite-500`}>{label}</dt>
      <dd className={`text-right ${t.body} text-ink-900`}>{children}</dd>
    </div>
  );
}

/** One fact in the summary strip under the page title. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={`${t.micro} font-semibold uppercase tracking-[0.08em] text-graphite-500`}>{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;

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

  const summary = await applicationSummary(id, { includeOffer: permits(admin.role, "offers") });

  const name = `${app.firstName} ${app.lastName}`;
  const locationParts = [app.city, app.state, app.zipCode, app.country].filter(Boolean);

  /* The candidate's own details. Passed into the workspace so they render as
     the first thing on the Overview tab — previously they sat above the tab
     bar, which pushed the tabs a full screen down the page. */
  const profileCards = (
    <>
      <Card title="Candidate">
        <dl>
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
          <Row label="Work authorized">{app.workAuthorized == null ? "Not provided" : app.workAuthorized ? "Yes" : "No"}</Row>
          <Row label="Needs sponsorship">{app.sponsorshipRequired == null ? "Not provided" : app.sponsorshipRequired ? "Yes" : "No"}</Row>
          {app.source && <Row label="Heard about us via">{app.source}</Row>}
          <Row label="Applied">{formatDateTime(app.createdAt)}</Row>
        </dl>
      </Card>

      <Card title="Resume">
        {app.resume ? (
          <>
            <div className="flex items-center gap-3">
              <FileText className="size-5 shrink-0 text-flame-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className={`truncate ${t.body} font-medium text-ink-900`}>{app.resume.originalFilename}</p>
                <p className={`${t.hint} text-graphite-600`}>{formatFileSize(app.resume.fileSize)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/admin/applications/${app.id}/resume`} target="_blank" rel="noopener noreferrer" className={adminButtonSecondary}>
                <Eye className="size-3.5" aria-hidden="true" />
                View
              </a>
              <a href={`/api/admin/applications/${app.id}/resume?download=1`} className={adminButton}>
                <Download className="size-3.5" aria-hidden="true" />
                Download
              </a>
            </div>
          </>
        ) : (
          <p className={`${t.body} text-graphite-600`}>No resume on file.</p>
        )}
      </Card>

      {app.coverLetter && (
        <Card title="Cover letter">
          <div className="space-y-3">
            {app.coverLetter.split("\n").filter(Boolean).map((p, i) => (
              <p key={i} className={`${t.body} leading-[1.7] text-graphite-700`}>{p}</p>
            ))}
          </div>
        </Card>
      )}
    </>
  );

  return (
    <>
      {/* The header carries identity and the one action that leaves this page.
          It previously also held Change stage / Schedule interview / Email —
          three buttons that only scrolled further down the same page, and
          which the workspace tabs below now address directly. */}
      <AdminHeader
        title={name}
        description={`${app.job.title} · ${app.reference}`}
        action={
          <>
            {app.resume && (
              <a
                href={`/admin/applications/${app.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                className={adminButtonSecondary}
              >
                <Eye className="size-3.5" aria-hidden="true" />
                Open resume
              </a>
            )}
            <Link href={`/admin/jobs/${app.job.reference}`} className={adminButtonSecondary}>
              Open job
            </Link>
          </>
        }
      />

      <PageBody>
        <Link href="/admin/applications" className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All candidates
        </Link>

        {/* At-a-glance: the facts a recruiter needs before reading anything
            else. Position is not repeated here — it is already in the page
            description directly above. */}
        <dl className="flex flex-wrap gap-x-10 gap-y-3 rounded-[4px] border border-paper-300 bg-white px-5 py-3.5">
          <Fact label="Stage">
            <StatusPill status={app.status} label={applicationStatusLabel[app.status]} />
          </Fact>
          <Fact label="Recruiter">
            <span className={`${t.body} text-ink-900`}>{summary?.assignedName ?? "Unassigned"}</span>
          </Fact>
          <Fact label="Applied">
            <span className={`${t.body} text-ink-900`}>{shortDate(app.createdAt)}</span>
          </Fact>
          {permits(admin.role, "offers") && (
            <Fact label="Offer">
              {summary?.offerStatus
                ? <StatusPill status={summary.offerStatus} label={offerStatusLabel[summary.offerStatus]} />
                : <span className={`${t.body} text-graphite-500`}>None</span>}
            </Fact>
          )}
        </dl>

        <CandidateWorkspace
          id={id}
          jobTitle={app.job.title}
          tab={tab}
          profile={profileCards}
        />
      </PageBody>
    </>
  );
}
