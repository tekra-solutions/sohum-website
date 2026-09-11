import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { offerVersions, offerTemplates } from "@/db/schema";
import { requireOffer } from "@/lib/offers/access";
import { canEditOffer, type OfferStatus } from "@/lib/offers/policy";
import { AdminHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/OfferForm";
import { t } from "@/components/admin/form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit offer" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { offer, application } = await requireOffer(id, "candidates");
  if (!canEditOffer(offer.status as OfferStatus)) notFound();

  const [version, templates] = await Promise.all([
    offer.currentVersionId
      ? db.select().from(offerVersions).where(eq(offerVersions.id, offer.currentVersionId)).then(r => r[0])
      : undefined,
    db.select({ id: offerTemplates.id, name: offerTemplates.name }).from(offerTemplates).where(eq(offerTemplates.isActive, true)),
  ]);
  if (!version) notFound();

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
            templates={templates}
          />
        </div>
      </div>
    </>
  );
}
