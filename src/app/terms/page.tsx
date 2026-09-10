import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms governing use of the ${site.legalName} website.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Use"
      lede="The terms that govern your use of this website."
      crumbs={[{ label: "Terms" }]}
      updated="September 2026"
    >
      <h2>Acceptance</h2>
      <p>
        By using this website you agree to these terms. If you do not agree with them, please do not
        use the site.
      </p>

      <h2>Informational purpose</h2>
      <p>
        The content on this site is provided for general information about {site.legalName} and its
        capabilities. It is not an offer, a quotation, or a commitment to perform work, and it does
        not create a contractual relationship. Contract terms are established only through a duly
        executed contract or task order.
      </p>

      <h2>Contract and procurement information</h2>
      <p>
        We publish contract vehicle information, including contract numbers and periods of
        performance, to assist government buyers. Vehicles whose period of performance has ended are
        identified as such. Before relying on any contract information for an acquisition, please
        confirm current details with us at{" "}
        <a href={`mailto:${contact.emailGeneral}`}>{contact.emailGeneral}</a> and with the
        administering agency.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The content, design, and code of this website are the property of {site.legalName} unless
        otherwise noted. Third-party names, marks, and logos referenced on this site remain the
        property of their respective owners, and their appearance does not imply endorsement,
        sponsorship, or an active contractual relationship unless expressly stated.
      </p>

      <h2>No warranty</h2>
      <p>
        This site is provided on an &ldquo;as is&rdquo; basis. While we work to keep the information
        here accurate and current, we make no warranty that it is complete or error-free, and we may
        change it at any time without notice.
      </p>

      <h2>External links</h2>
      <p>
        Links to third-party sites are provided for convenience. We do not control those sites and
        are not responsible for their content or practices.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Kansas, without regard to its conflict
        of laws provisions.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms may be sent to{" "}
        <a href={`mailto:${contact.emailGeneral}`}>{contact.emailGeneral}</a>.
      </p>
    </LegalLayout>
  );
}
