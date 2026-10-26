/**
 * Single source of truth for factual company information.
 *
 * Every procurement fact here was checked against a public federal record on
 * 2026-10-05; `sources` lists where. Marketing prose lives in page components.
 *
 * Rules:
 *  - Never add a credential, customer, vehicle, or metric without a source.
 *  - Never hardcode a status. Statuses are computed from the dates below, so the
 *    site changes on its own when a period starts or ends.
 *  - An unknown value is left undefined and the UI omits it. Placeholder text
 *    never reaches the page.
 */

/* ------------------------------------------------------------------ Company */

export const site = {
  name: "Sohum Systems",
  legalName: "Sohum Systems, LLC",
  url: "https://sohumsystems.com",
  founded: 2013,
  tagline: "Mission-critical technology for federal agencies",
  description:
    "Sohum Systems is a CMMI Level 3 appraised small business delivering software engineering, cloud modernization, AI and data analytics, and GIS solutions to federal agencies.",
} as const;

export const contact = {
  street: "9232 W 143rd Terrace",
  city: "Overland Park",
  state: "KS",
  zip: "66221",
  get address() {
    return `${this.street}, ${this.city}, ${this.state} ${this.zip}`;
  },
  phone: "(913) 259-7699",
  phoneAlt: "(913) 221-7204",
  phoneHref: "+19132597699",
  phoneAltHref: "+19132217204",
  fax: "(913) 273-0269",
  emailGeneral: "info@sohumsystems.com",
  emailHr: "hr@sohumsystems.com",
  // Secondary office appearing on current job listings
  officeAlt: "7900 College Blvd, Suite 135, Overland Park, KS 66210",
} as const;

/**
 * Point of contact for contracting officers and teaming partners. This is the
 * person SAM.gov, SBA and NITAAC list for the company.
 */
export const businessDevelopment = {
  name: "Srinivas Moshugu",
  title: "Chief Executive Officer",
  role: "Contracts & business development",
  email: contact.emailGeneral,
  phone: contact.phone,
  phoneHref: contact.phoneHref,
  directPhone: contact.phoneAlt,
  directPhoneHref: contact.phoneAltHref,
} as const;

/** Public records a buyer can use to verify everything on the site. */
export const sources = {
  checkedOn: "2026-10-05",
  usaspending: "https://www.usaspending.gov/recipient/f7040ec6-bd8c-e8b8-7682-fb74081b08a3-C/latest",
  sbaProfile: "https://search.certifications.sba.gov/profile/M38RK2BCFE29",
  nitaac: "https://nitaac.nih.gov/gwacs/cio-sp3-small-business/contract-holder/sohum-systems-llc",
  gsaElibrary:
    "https://www.gsaelibrary.gsa.gov/ElibMain/contractorInfo.do?contractNumber=47QTCA19D00FK&contractorName=SOHUM+SYSTEMS+LLC&executeQuery=YES",
  cmmiPars: "https://cmmiinstitute.com/pars",
} as const;

/* -------------------------------------------------------------- Identifiers */

export const procurement = {
  /** SAM.gov Unique Entity ID. Replaced DUNS government-wide in April 2022. */
  uei: "M38RK2BCFE29",
  cage: "7WCV6",
  primaryNaics: "541511",
  businessSize: "Small business",
  headquarters: "Overland Park, KS",
  /** Path to the capability statement. */
  capabilityStatement: "/capability-statement",
} as const;

/** Compact identifier list for footers and reference tables. */
export const identifiers = [
  { label: "UEI", value: procurement.uei },
  { label: "CAGE", value: procurement.cage },
  { label: "Business size", value: procurement.businessSize },
  { label: "Primary NAICS", value: procurement.primaryNaics },
] as const;

export type Naics = { code: string; label: string; primary?: boolean };

export const naics: Naics[] = [
  { code: "541511", label: "Custom Computer Programming Services", primary: true },
  { code: "541512", label: "Computer Systems Design Services" },
  { code: "541513", label: "Computer Facilities Management Services" },
  { code: "541519", label: "Other Computer Related Services" },
  { code: "541330", label: "Engineering Services" },
  { code: "541611", label: "Administrative & General Management Consulting" },
];

/* ------------------------------------------------------------------- Dates */

/** Today as an ISO civil date in the federal buyer's Eastern time zone. */
export function today(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "2026-10-29" → "Oct 29, 2026". */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}

/** "2026-10-29" → "October 2026". */
export function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(value + "T12:00:00Z"),
  );
}

/** Whole days from `from` to `to` (both ISO civil dates). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to + "T12:00:00Z").getTime() - new Date(from + "T12:00:00Z").getTime()) / 86_400_000,
  );
}

/* ------------------------------------------------------------ SBA 8(a) */

/**
 * SBA 8(a) program term, as recorded in SBA's certification search (case 30634,
 * Kansas City District Office). SBA lists the exit date as 2026-02-27.
 * If SBA reinstates or corrects the record, update `exitsOn` and every 8(a)
 * claim on the site follows.
 */
export const sba8a = {
  entersOn: "2018-11-11",
  exitsOn: "2026-02-27",
} as const;

export function is8aActive(day = today()): boolean {
  return day >= sba8a.entersOn && day <= sba8a.exitsOn;
}

/** Remaining 8(a) term in plain words, or null once the term has ended. */
export function sbaCountdown(day = today()): string | null {
  if (!is8aActive(day)) return null;
  const end = new Date(sba8a.exitsOn + "T12:00:00Z");
  const start = new Date(day + "T12:00:00Z");
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth() -
    (end.getUTCDate() < start.getUTCDate() ? 1 : 0);
  if (months > 0) return `${months} month${months === 1 ? "" : "s"} remaining`;
  const days = daysBetween(day, sba8a.exitsOn);
  return days === 0 ? "Final day of program term" : `${days} day${days === 1 ? "" : "s"} remaining`;
}

/** Socioeconomic designations as SAM.gov and SBA report them today. */
export function socioeconomic(day = today()): string[] {
  return [
    "Small business",
    ...(is8aActive(day) ? ["SBA 8(a) participant"] : []),
    "Small disadvantaged business (self-certified)",
    "Minority-owned",
  ];
}

/** Short 8(a) line for compact bars, or null when there is nothing current to say. */
export function sba8aLabel(day = today()): string | null {
  if (is8aActive(day)) return `SBA 8(a) through ${formatDate(sba8a.exitsOn)}`;
  return null;
}

/* ---------------------------------------------------------- Credentials */

export type Credential = {
  short: string;
  name: string;
  kind: string;
  badge: string;
  meaning: string;
  /** Inclusive last day of validity, when known. Unknown → "on request". */
  validThrough?: string;
  /** Public registry where a buyer can verify the credential. */
  verifyAt?: { label: string; href: string };
};

export const credentials: Credential[] = [
  {
    short: "CMMI DEV L3",
    name: "CMMI for Development, Level 3",
    kind: "Maturity appraisal",
    badge: "/certs/cmmi-dev.png",
    meaning:
      "Development work follows defined, organization-wide processes rather than per-project improvisation. That is the baseline many agencies require for software sustainment.",
    verifyAt: { label: "Verify on CMMI PARS", href: sources.cmmiPars },
  },
  {
    short: "CMMI SVC L3",
    name: "CMMI for Services, Level 3",
    kind: "Maturity appraisal",
    badge: "/certs/cmmi-svc.png",
    meaning:
      "Service delivery and sustainment are managed against defined processes, which matters for O&M and help-desk task orders.",
    verifyAt: { label: "Verify on CMMI PARS", href: sources.cmmiPars },
  },
  {
    short: "ISO 9001",
    name: "ISO 9001:2015",
    kind: "Quality management",
    badge: "/certs/iso-9001.webp",
    meaning: "An audited quality management system governs how work is planned, reviewed, and corrected.",
  },
  {
    short: "ISO/IEC 20000-1",
    name: "ISO/IEC 20000-1:2018",
    kind: "IT service management",
    badge: "/certs/iso-20000.webp",
    meaning:
      "IT service management practices are certified against the international standard for service lifecycle control.",
  },
  {
    short: "ISO/IEC 27001",
    // Edition intentionally omitted: the :2013 edition was withdrawn in 2025 and
    // the current certificate's edition has not been confirmed.
    name: "ISO/IEC 27001",
    kind: "Information security",
    badge: "/certs/iso-27001.webp",
    meaning:
      "An information security management system governs access control, authentication, and the confidentiality, integrity, and availability of data.",
  },
  {
    short: "SBA 8(a)",
    name: "SBA 8(a) Business Development Program",
    kind: "Socioeconomic certification",
    badge: "/certs/sba-8a.webp",
    validThrough: sba8a.exitsOn,
    meaning: "Eligible for 8(a) sole-source and set-aside awards within program thresholds.",
    verifyAt: { label: "Verify on SBA", href: sources.sbaProfile },
  },
];

/** A credential is shown until its known validity date has passed. */
export function credentialStatus(credential: Credential, day = today()): "Valid" | "Expired" | null {
  if (!credential.validThrough) return null;
  return day > credential.validThrough ? "Expired" : "Valid";
}

export function getVisibleCredentials(day = today()): Credential[] {
  return credentials.filter((c) => credentialStatus(c, day) !== "Expired");
}

/* ------------------------------------------------------- Contract vehicles */

export type Vehicle = {
  slug: string;
  name: string;
  full: string;
  holder: string;
  /** Official programme badge artwork, where the issuing body publishes one. */
  badge?: string;
  number: string;
  /** First day orders may be placed. */
  orderingStartsOn: string;
  /** Last day new orders may be placed (inclusive). */
  orderingEndsOn: string;
  /** Last day existing task orders may run, when it extends past ordering. */
  taskOrdersEndOn?: string;
  orderTypes: string;
  detail: { label: string; value: string }[];
  summary: string;
  useIt: string;
  /** Public record for the vehicle. */
  verifyAt?: { label: string; href: string };
};

/**
 * Dates come from the IDV records on USAspending.gov (period of performance =
 * ordering period). CIO-SP3 task orders may run up to five years past the
 * ordering period per the NITAAC ordering guide.
 */
export const vehicles: Vehicle[] = [
  {
    slug: "gsa-mas",
    name: "GSA Multiple Award Schedule",
    full: "GSA MAS, Information Technology Category (formerly IT Schedule 70)",
    holder: "U.S. General Services Administration",
    badge: "/certs/gsa-schedule70.webp",
    number: "47QTCA19D00FK",
    orderingStartsOn: "2019-07-18",
    orderingEndsOn: "2029-07-17",
    orderTypes: "Firm-fixed-price, T&M, and labor-hour orders under FAR 8.4",
    detail: [{ label: "Contract type", value: "Federal Supply Schedule" }],
    summary:
      "The GSA Multiple Award Schedule is open to every federal agency and to state and local buyers through cooperative purchasing. Our IT category contract covers software, cloud, data, and GIS services.",
    useIt:
      "Place an order through GSA eBuy or directly against 47QTCA19D00FK under FAR 8.4. Agencies including FMCSA order from us on this schedule today.",
    verifyAt: { label: "GSA eLibrary", href: sources.gsaElibrary },
  },
  {
    slug: "seaport-nxg",
    name: "SeaPort NxG",
    full: "SeaPort Next Generation",
    holder: "U.S. Navy",
    badge: "/certs/seaport.webp",
    number: "N0017819D8532",
    orderingStartsOn: "2019-01-02",
    orderingEndsOn: "2029-01-01",
    orderTypes: "Order-dependent; pricing is set per task order",
    detail: [{ label: "Contract type", value: "Multiple-award IDIQ" }],
    summary:
      "SeaPort is the Navy's electronic platform for acquiring support services across 22 functional areas, used by the Navy Systems Commands, Office of Naval Research, Military Sealift Command, and the Marine Corps.",
    useIt:
      "Navy and Marine Corps ordering offices issue task orders through the SeaPort portal. We have delivered engineering and logistics work for the Navy at Port Hueneme, California on this vehicle.",
  },
  {
    slug: "cio-sp3",
    name: "CIO-SP3 Small Business",
    full: "Chief Information Officer – Solutions and Partners 3, Small Business",
    holder: "NITAAC, National Institutes of Health",
    badge: "/certs/nitaac.webp",
    number: "75N98120D00062",
    orderingStartsOn: "2020-05-11",
    orderingEndsOn: "2026-10-29",
    taskOrdersEndOn: "2031-10-29",
    orderTypes: "FFP, CPFF, CPAF, CPIF, T&M",
    detail: [{ label: "Track", value: "Small Business" }],
    summary:
      "A government-wide IDIQ usable by any U.S. Government agency, including the Department of Defense, across a broad range of IT requirements.",
    useIt:
      "Issue a task order through the NITAAC e-GOS ordering system before the ordering period closes. Orders already awarded may run up to five years past that date.",
    verifyAt: { label: "NITAAC contract holder page", href: sources.nitaac },
  },
];

export type VehicleStatus =
  | "Active"
  | "Ordering closed – existing task orders continue"
  | "Expired"
  | `Ordering opens ${string}`;

export function vehicleStatus(vehicle: Vehicle, day = today()): VehicleStatus {
  if (day < vehicle.orderingStartsOn) return `Ordering opens ${formatDate(vehicle.orderingStartsOn)}`;
  if (day <= vehicle.orderingEndsOn) return "Active";
  if (vehicle.taskOrdersEndOn && day <= vehicle.taskOrdersEndOn) {
    return "Ordering closed – existing task orders continue";
  }
  return "Expired";
}

/** Days left to place a new order, when ordering is open and closes within 90 days. */
export function orderingClosesIn(vehicle: Vehicle, day = today()): number | null {
  if (vehicleStatus(vehicle, day) !== "Active") return null;
  const days = daysBetween(day, vehicle.orderingEndsOn);
  return days <= 90 ? days : null;
}

/** Expired vehicles are hidden. Open vehicles sort ahead of closed ones. */
export function getVisibleVehicles(day = today()): Vehicle[] {
  const rank = (v: Vehicle) => (vehicleStatus(v, day) === "Active" ? 0 : 1);
  return vehicles
    .filter((v) => vehicleStatus(v, day) !== "Expired")
    .sort((a, b) => rank(a) - rank(b));
}

export function getExpiredVehicles(day = today()): Vehicle[] {
  return vehicles.filter((v) => vehicleStatus(v, day) === "Expired");
}

export function getActiveVehicles(day = today()): Vehicle[] {
  return vehicles.filter((v) => vehicleStatus(v, day) === "Active");
}

/* ---------------------------------------------------- Past performance */

export type Program = {
  id: string;
  program: string;
  name: string;
  agency: string;
  description: string;
  work: string[];
  /** Fields below come from federal award records; omitted when not public. */
  contract?: string;
  period?: string;
  /** ISO dates for `period`. The record gives months; the days are nominal. */
  start?: string;
  end?: string;
  contractType?: string;
  naics?: string;
  placeOfPerformance?: string;
};

export const pastPerformance: Program[] = [
  {
    id: "dfad",
    program: "DFAD",
    name: "DFAD Common IT Solutions",
    agency: "USDA Farm Service Agency",
    description:
      "Recognized program work with the Farm Service Agency's Digital Farm and Agricultural Data efforts: GIS operations and modernization, financial management systems, and the reporting program staff use daily.",
    work: ["GIS O&M and modernization", "Financial management systems (CFMIS)", "Reporting and data platforms"],
    contract: "IDIQ AG3151C140045",
    period: "Sep 2014 – Mar 2022",
    start: "2014-09-01",
    end: "2022-03-31",
    contractType: "Labor-hour task orders",
    naics: "541511",
    placeOfPerformance: "Kansas City, MO",
  },
  {
    id: "parmo",
    program: "PARMO",
    name: "Production Adjustment and Risk Management",
    agency: "USDA Farm Service Agency",
    description:
      "Recognized program work supporting the Farm Service Agency's Production Adjustment and Risk Management operations.",
    work: ["Program operations support", "Reporting", "Data platforms"],
  },
];

/** Current federal orders, from USAspending.gov. Shown as a verifiable record. */
export type AwardRecord = {
  agency: string;
  work: string;
  order: string;
  vehicle: string;
  start: string;
  end: string;
};

export const currentAwards: AwardRecord[] = [
  {
    agency: "U.S. Department of Agriculture",
    work: "Software delivery, development and modernization support",
    order: "12314425F0159",
    vehicle: "CIO-SP3 SB",
    start: "2025-05-12",
    end: "2030-05-11",
  },
  {
    agency: "U.S. Department of Agriculture",
    work: "Geospatial software O&M and modernization",
    order: "12314424F0221",
    vehicle: "CIO-SP3 SB",
    start: "2024-05-10",
    end: "2029-05-09",
  },
  {
    agency: "DOT Federal Motor Carrier Safety Administration",
    work: "SAFESPECT inspection platform product support",
    order: "693JJ426F00054N",
    vehicle: "GSA MAS",
    start: "2026-09-10",
    end: "2027-09-09",
  },
  {
    agency: "DOT Federal Motor Carrier Safety Administration",
    work: "CDLIS gateway replacement",
    order: "693JJ424F00065N",
    vehicle: "GSA MAS",
    start: "2024-09-30",
    end: "2027-03-30",
  },
];

/** Federal customers named in public award records. Typeset — never agency seals. */
export const customers = [
  "U.S. Department of Agriculture",
  "USDA Farm Service Agency",
  "DOT Federal Motor Carrier Safety Administration",
  "DOT Federal Railroad Administration",
  "U.S. Department of the Navy",
  "Commodity Futures Trading Commission",
] as const;

/* ------------------------------------------------------------ Leadership */

export const leadership = [
  {
    name: "Srinivas Moshugu",
    note: "Founded Sohum Systems in 2013. Eighteen years in IT, leading strategy, alliances, and partnerships.",
    title: "Chief Executive Officer",
    photo: "/team/srinivas-moshugu.webp",
    bio: "Srinivas founded Sohum Systems in 2013 in Overland Park, Kansas. He brings eighteen years of IT experience to the company and plays an integral role in strategic planning, alliances, and partnerships. He received his bachelor's degree from Osmania University in Hyderabad, India.",
    facts: ["18 years in IT", "Founder, 2013", "Osmania University"],
  },
  {
    name: "Jamie Royston",
    note: "Twenty-plus years of financial and operational leadership in the government market. MBA, PMP.",
    title: "Director of Operations",
    photo: "/team/jamie-royston.webp",
    bio: "Jamie joined Sohum as Director of Operations in 2023, bringing more than twenty years of financial and operational leadership experience in the government market. Jamie holds a Master of Business Administration from Brenau University and the Project Management Professional (PMP) certification.",
    facts: ["20+ years in government market", "MBA, Brenau University", "PMP certified"],
  },
  {
    name: "Jacob Robertson",
    note: "Twenty-plus years in technical leadership, program management, and DevSecOps architecture.",
    title: "Technical Director",
    photo: "/team/jacob-robertson.webp",
    bio: "With over twenty years of experience in technical leadership, program management, and solutions and DevSecOps architecture, Jacob has a proven track record leading and managing technical teams, developing innovative solutions, and driving large-scale projects to completion.",
    facts: ["20+ years technical leadership", "DevSecOps architecture", "Program management"],
  },
];

/* ----------------------------------------------------------------- Logos */

/**
 * Organizations shown on the logo wall, as on the previous sohumsystems.com.
 *
 * Displayed at the site owner's direction (2026-10-25). Groups are kept
 * separate so a platform or framework is never read as a client, and every
 * placement carries the trademark disclaimer in components/ClientLogos.tsx.
 */
export type LogoGroup = {
  id: string;
  label: string;
  /** Plain-language note on what this group actually represents. */
  note: string;
  items: { name: string; file: string; alt: string }[];
};

export const logoGroups: LogoGroup[] = [
  {
    id: "government",
    label: "Government organizations",
    note: "Federal organizations represented in our work and contract vehicles.",
    items: [
      { name: "U.S. Department of Agriculture", file: "usda.webp", alt: "U.S. Department of Agriculture" },
      { name: "Farm Service Agency", file: "fsa.webp", alt: "USDA Farm Service Agency" },
      { name: "U.S. General Services Administration", file: "gsa.webp", alt: "U.S. General Services Administration" },
      { name: "U.S. Department of Transportation", file: "usdot.webp", alt: "U.S. Department of Transportation" },
      { name: "U.S. Department of the Navy", file: "navy.webp", alt: "U.S. Department of the Navy" },
    ],
  },
  {
    id: "commercial",
    label: "Commercial organizations",
    note: "Commercial organizations represented in our work.",
    items: [
      { name: "American Century", file: "american-century.webp", alt: "American Century" },
      { name: "CITI", file: "citi.webp", alt: "Creative Information Technology, Inc." },
      { name: "Dell", file: "dell.webp", alt: "Dell" },
      { name: "HP", file: "hp.webp", alt: "HP" },
    ],
  },
  {
    id: "technology",
    label: "Technology & frameworks",
    note: "Platforms our engineers build on and the delivery frameworks our teams are certified in.",
    items: [
      { name: "Amazon Web Services", file: "aws.webp", alt: "Amazon Web Services" },
      { name: "Atlassian", file: "atlassian.webp", alt: "Atlassian" },
      { name: "SAFe", file: "safe.webp", alt: "Scaled Agile Framework (SAFe)" },
      { name: "Scrum Alliance", file: "scrum-alliance.webp", alt: "Scrum Alliance" },
    ],
  },
];

export const allLogos = logoGroups.flatMap((g) => g.items);
