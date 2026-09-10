import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { contact, credentials, naics, site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Trim the axis range we actually use to keep the payload small.
  weight: ["400", "500", "600"],
});

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Sohum Systems — Digital Modernization for Government",
    template: "%s | Sohum Systems",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.legalName }],
  keywords: [
    "Sohum",
    "Sohum Systems",
    "Sohum Systems LLC",
    "IT company Overland Park",
    "IT company Kansas City",
    "Kansas IT company",
    "software development Kansas City",
    "federal IT services",
    "government technology solutions",
    "SBA 8(a) IT contractor",
    "CMMI Level 3",
    "federal cloud modernization",
    "government AI and data analytics",
    "enterprise GIS",
    "NASA SEWP VI",
    "CIO-SP3",
    "custom application development",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    url: site.url,
    title: "Sohum Systems — Digital Modernization for Government",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sohum Systems — Digital Modernization for Government",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#080d1a",
  width: "device-width",
  initialScale: 1,
};

/** Organization schema — every value traces to published company information. */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.legalName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
  foundingDate: String(site.founded),
  email: contact.emailGeneral,
  telephone: contact.phone,
  faxNumber: contact.fax,
  address: {
    "@type": "PostalAddress",
    streetAddress: contact.street,
    addressLocality: contact.city,
    addressRegion: contact.state,
    postalCode: contact.zip,
    addressCountry: "US",
  },
  identifier: [
    { "@type": "PropertyValue", propertyID: "DUNS", value: "053861658" },
    { "@type": "PropertyValue", propertyID: "CAGE", value: "7WCV6" },
  ],
  naics: naics.find((n) => n.primary)?.code,
  areaServed: [
    { "@type": "Country", name: "United States" },
    { "@type": "State", name: "Kansas" },
    { "@type": "City", name: "Overland Park" },
    { "@type": "City", name: "Kansas City" },
  ],
  slogan: "Technology | Talent | Trust",
  hasCredential: credentials.map((c) => ({
    "@type": "EducationalOccupationalCredential",
    name: c.name,
    credentialCategory: c.kind,
  })),
  knowsAbout: [
    "Custom application development",
    "Cloud migration and modernization",
    "Artificial intelligence and machine learning",
    "Geographic information systems",
    "Data warehousing",
    "Business intelligence",
    "DevOps",
    "Test automation",
    "Program and project management",
    "Enterprise resource planning",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: contact.phone,
      email: contact.emailGeneral,
      areaServed: "US",
      availableLanguage: "English",
    },
    {
      "@type": "ContactPoint",
      contactType: "human resources",
      email: contact.emailHr,
      areaServed: "US",
      availableLanguage: "English",
    },
  ],
};

/** Reinforces the brand name for "Sohum" / "Sohum Systems" queries. */
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: site.name,
  alternateName: ["Sohum", site.legalName],
  description: site.description,
  publisher: { "@id": `${site.url}/#organization` },
  inLanguage: "en-US",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <head>
        {/*
          Marks the document as scripted before first paint. Scroll-reveal styles
          are scoped to `.js`, so with JavaScript unavailable the page renders
          fully visible instead of blank. Runs synchronously to avoid any flash.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js")`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <script
          type="application/ld+json"
          // Static, developer-authored schema objects.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
