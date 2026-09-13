import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { offerVersions, offerTemplates, recruitingSettings } from "@/db/schema";
import { requireOffer } from "@/lib/offers/access";
import { permits } from "@/lib/ats/policy";
import { canEditOffer, type OfferStatus } from "@/lib/offers/policy";
import { AdminHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/OfferForm";
import { templatePreview } from "@/lib/offers/variables";
import { renderTemplatePreview } from "@/lib/offers/template-preview";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit offer" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, offer, application } = await requireOffer(id, "candidates");
  if (!canEditOffer(offer.status as OfferStatus)) notFound();

  const [version, templates, settingsRow] = await Promise.all([
    offer.currentVersionId
      ? db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId)).then(r => r[0])
      : undefined,
    db.select().from(offerTemplates).where(eq(offerTemplates.isActive, true)),
    db.select().from(recruitingSettings).limit(1).then(r => r[0]),
  ]);
  if (!version) notFound();

  // Rendered against the version's own values, so the preview shows this
  // offer's letter rather than a generic one.
  const previewValues = {
    candidateFirstName: application.firstName,
    candidateName: `${application.firstName} ${application.lastName}`,
    candidateEmail: application.email,
    candidateAddress: [application.address, [application.city, application.state, application.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(", "),
    jobTitle: version.jobTitle,
    department: version.department,
    location: version.location,
    employmentType: version.employmentType,
    remoteType: version.remoteType,
    workLocation: version.workLocation,
    hiringManagerName: version.hiringManagerName,
    reportsTo: version.reportsTo,
    benefitsSummary: version.benefitsSummary ?? settingsRow?.defaultBenefitsSummary,
    ptoSummary: version.ptoSummary ?? settingsRow?.defaultPtoSummary,
    hrContactEmail: settingsRow?.hrContactEmail,
    authorizedRepName: settingsRow?.authorizedRepName,
    authorizedRepTitle: settingsRow?.authorizedRepTitle,
    annualSalaryCents: version.annualSalaryCents,
    startDate: version.startDate?.toISOString().slice(0, 10) ?? null,
    expirationDate: version.expirationDate?.toISOString().slice(0, 10) ?? null,
  };

  const templateOptions = templates.map(tpl => ({
    id: tpl.id, name: tpl.name, category: tpl.category,
    preview: templatePreview(tpl.bodyHtml),
    rendered: renderTemplatePreview(tpl, previewValues),
  }));

  return (
    <>
      <AdminHeader title="Edit offer letter" description={`${application.firstName} ${application.lastName} · ${version.jobTitle}`} />
      <div className="p-5 sm:p-6 lg:p-8">
        <Link href={`/admin/offers/${id}`} className={`inline-flex items-center gap-1.5 ${t.body} font-medium text-graphite-700 hover:text-ink-900`}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Offer
        </Link>
        <p className={`mt-3 max-w-3xl ${t.hint} text-graphite-500`}>
          Saving creates a new version. If this offer was already approved or sent, it reverts to draft and must be resubmitted.
        </p>
        <div className="mt-4 max-w-3xl rounded-[4px] border border-paper-300 bg-white p-5 sm:p-6">
          <OfferForm
            applicationId={application.id}
            offerId={id}
            candidate={{
              fullName: `${application.firstName} ${application.lastName}`,
              email: application.email,
              address: [application.address, [application.city, application.state, application.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(", ") || null,
              phone: application.phone,
            }}
            version={version}
            templates={templateOptions}
            /* Without this the edit form defaulted to the first template in the
               list, so re-saving an offer silently swapped its letter for a
               different one. */
            selectedTemplateId={offer.templateId}
            defaults={{
              authorizedRepName: settingsRow?.authorizedRepName ?? null,
              benefitsConfigured: Boolean(settingsRow?.defaultBenefitsSummary?.trim()),
              ptoConfigured: Boolean(settingsRow?.defaultPtoSummary?.trim()),
              settingsHref: "/admin/settings",
              canEditSettings: permits(admin.role, "settings"),
            }}
          />
        </div>
      </div>
    </>
  );
}
