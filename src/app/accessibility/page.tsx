import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: `Accessibility commitment and conformance status for the ${site.legalName} website.`,
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <LegalLayout
      eyebrow="Accessibility"
      title="Accessibility Statement"
      lede="We build for everyone who needs to use this site, and we want to hear about it when we fall short."
      crumbs={[{ label: "Accessibility" }]}
      updated="September 2026"
    >
      <h2>Our commitment</h2>
      <p>
        We deliver software to federal agencies, where accessibility is a requirement rather than an
        aspiration. We hold our own website to the same standard we apply to the systems we build.
      </p>

      <h2>Conformance target</h2>
      <p>
        This site is designed and built to meet the Web Content Accessibility Guidelines (WCAG) 2.2
        Level AA. Specific measures in place include:
      </p>
      <ul>
        <li>Semantic HTML with a single, ordered heading hierarchy on every page</li>
        <li>A skip-to-content link as the first focusable element</li>
        <li>Visible, high-contrast focus indicators on all interactive elements</li>
        <li>Full keyboard operability, including the navigation menus</li>
        <li>Text and interface colors tested against WCAG contrast minimums</li>
        <li>Form fields with programmatically associated labels and error messages</li>
        <li>Status and validation messages announced through live regions</li>
        <li>Full support for the operating system&rsquo;s reduced-motion preference</li>
        <li>Layouts that reflow without horizontal scrolling down to 320 pixels wide</li>
        <li>Text that remains readable and functional when zoomed to 200 percent</li>
      </ul>

      <h2>Motion</h2>
      <p>
        Animation on this site is limited to subtle entrance and hover transitions. If your system is
        set to reduce motion, those transitions are disabled and the site renders complete and
        static.
      </p>

      <h2>Known limitations</h2>
      <p>
        We test with keyboard navigation, screen readers, and automated tooling, but no site is ever
        finished. If you encounter a barrier, it is a defect and we want to fix it.
      </p>

      <h2>Feedback</h2>
      <p>
        Tell us what you ran into, the page you were on, and the assistive technology you were using,
        and we will respond. Write to{" "}
        <a href={`mailto:${contact.emailGeneral}`}>{contact.emailGeneral}</a> or call {contact.phone}.
      </p>

      <h2>Alternative formats</h2>
      <p>
        If any information on this site is not accessible to you, contact us and we will provide it
        in an alternative format.
      </p>
      <p>
        {site.legalName}
        <br />
        {contact.street}
        <br />
        {contact.city}, {contact.state} {contact.zip}
      </p>
    </LegalLayout>
  );
}
