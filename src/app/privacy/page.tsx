import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.legalName} handles information submitted through this website.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lede="How we handle information submitted through this website."
      crumbs={[{ label: "Privacy" }]}
      updated="September 2026"
    >
      <h2>Information we collect</h2>
      <p>
        This website collects only the information you choose to send us. When you use the contact
        form, your message is composed in your own email client and sent directly to us — the
        website itself does not store submissions on a server.
      </p>
      <p>Information you may choose to provide includes:</p>
      <ul>
        <li>Your name and the organization or agency you represent</li>
        <li>Your email address and telephone number</li>
        <li>The subject and content of your message</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use the information you send to respond to your inquiry and to maintain a record of our
        correspondence. We do not sell it, rent it, or share it with third parties for marketing.
        Information relating to a procurement or contract action is retained in accordance with
        applicable federal records and contracting requirements.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        This website does not set advertising cookies and does not use third-party advertising
        trackers. Any measurement we perform is limited to aggregate traffic patterns and is not used
        to build individual profiles.
      </p>

      <h2>Employment applications</h2>
      <p>
        Résumés and application materials sent to{" "}
        <a href={`mailto:${contact.emailHr}`}>{contact.emailHr}</a> are used to evaluate your
        candidacy and are retained in accordance with applicable employment record requirements.
      </p>

      <h2>Security</h2>
      <p>
        We maintain an information security management system certified to ISO/IEC 27001. Our quality
        policy commits us to maintaining the confidentiality, integrity, and availability of
        information, and to making it accessible only to authorized users through proper
        authentication and access control. No method of transmission over the internet is completely
        secure; please do not send classified, controlled unclassified, or otherwise sensitive
        material through this website.
      </p>

      <h2>Your choices</h2>
      <p>
        You may ask us what information we hold about you, ask us to correct it, or ask us to delete
        it, subject to any records-retention obligations that apply. Write to{" "}
        <a href={`mailto:${contact.emailGeneral}`}>{contact.emailGeneral}</a>.
      </p>

      <h2>Contact</h2>
      <p>
        {site.legalName}
        <br />
        {contact.street}
        <br />
        {contact.city}, {contact.state} {contact.zip}
        <br />
        <a href={`mailto:${contact.emailGeneral}`}>{contact.emailGeneral}</a>
        <br />
        {contact.phone}
      </p>
    </LegalLayout>
  );
}
