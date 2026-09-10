/**
 * Single source of truth for all factual company information.
 *
 * Every value here is traceable to sohumsystems.com (captured 2026-09-09).
 * Marketing prose lives in page components; verifiable facts live here.
 * Do not add credentials, customers, or metrics that the source does not support.
 */

export const site = {
  name: "Sohum Systems",
  legalName: "Sohum Systems, LLC",
  url: "https://sohumsystems.com",
  founded: 2013,
  tagline: "Mission-critical technology for federal agencies",
  description:
    "Sohum Systems is an SBA-certified 8(a), CMMI Level 3 appraised technology firm delivering software engineering, cloud modernization, AI and data analytics, and GIS solutions to federal agencies.",
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
  fax: "(913) 273-0269",
  emailGeneral: "info@sohumsystems.com",
  emailHr: "hr@sohumsystems.com",
  // Secondary office appearing on current job listings
  officeAlt: "7900 College Blvd, Suite 135, Overland Park, KS 66210",
} as const;

export const identifiers = [
  { label: "DUNS", value: "053861658" },
  { label: "CAGE", value: "7WCV6" },
  { label: "Business size", value: "Small business" },
  { label: "Socioeconomic", value: "SBA 8(a)" },
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

/** Appraisals and certifications evidenced on the current site. */
export const credentials = [
  {
    short: "CMMI DEV L3",
    name: "CMMI for Development, Level 3",
    kind: "Maturity appraisal",
    meaning:
      "Development work follows defined, organization-wide processes rather than per-project improvisation — the baseline many agencies require for software sustainment.",
  },
  {
    short: "CMMI SVC L3",
    name: "CMMI for Services, Level 3",
    kind: "Maturity appraisal",
    meaning:
      "Service delivery and sustainment are managed against defined processes, which matters for O&M and help-desk task orders.",
  },
  {
    short: "ISO 9001",
    name: "ISO 9001",
    kind: "Quality management",
    meaning: "An audited quality management system governs how work is planned, reviewed, and corrected.",
  },
  {
    short: "ISO/IEC 20000-1:2018",
    name: "ISO/IEC 20000-1:2018",
    kind: "IT service management",
    meaning: "IT service management practices are certified against the international standard for service lifecycle control.",
  },
  {
    short: "ISO/IEC 27001",
    name: "ISO/IEC 27001",
    kind: "Information security",
    meaning:
      "An information security management system governs access control, authentication, and the confidentiality, integrity, and availability of data.",
  },
  {
    short: "SBA 8(a)",
    name: "SBA 8(a) Business Development Program",
    kind: "Socioeconomic certification",
    meaning: "Eligible for 8(a) sole-source and set-aside awards through November 11, 2027.",
  },
] as const;

export type Vehicle = {
  slug: string;
  name: string;
  full?: string;
  holder: string;
  number?: string;
  status: "active" | "expired";
  pop?: string;
  detail: { label: string; value: string }[];
  summary: string;
  useIt: string;
};

export const vehicles: Vehicle[] = [
  {
    slug: "sewp-vi",
    name: "NASA SEWP VI",
    full: "Solutions for Enterprise-Wide Procurement VI",
    holder: "NASA",
    status: "active",
    pop: "Nov 2026 – Oct 2036",
    detail: [
      { label: "Category", value: "A" },
      { label: "Contract type", value: "GWAC" },
      { label: "Period of performance", value: "Nov 2026 – Oct 2036" },
      { label: "Surcharge", value: "0.34%" },
    ],
    summary:
      "SEWP is the government-wide acquisition contract for IT, communications, and audio-visual solutions, open to every federal agency and their approved contractors. The program is self-funded through a 0.34% usage fee and processes more than 50,000 orders a year.",
    useIt:
      "Issue an RFQ through the NASA SEWP quoting system under Category A. Fair opportunity is provided at the order level per FAR 16.505(b), and quotes typically return in days rather than weeks.",
  },
  {
    slug: "8a",
    name: "SBA 8(a)",
    full: "SBA 8(a) Business Development Program",
    holder: "U.S. Small Business Administration",
    status: "active",
    pop: "Nov 12, 2018 – Nov 11, 2027",
    detail: [
      { label: "Entrance date", value: "November 12, 2018" },
      { label: "Exit date", value: "November 11, 2027" },
    ],
    summary:
      "8(a) certification lets contracting officers award directly to Sohum Systems without full and open competition, within program thresholds.",
    useIt:
      "Sole-source award is the fastest path to putting a team in place. Contact us with your requirement and we will work your contracting officer through the 8(a) offer-and-acceptance process.",
  },
  {
    slug: "cio-sp3",
    name: "CIO-SP3 Small Business",
    full: "Chief Information Officer – Solutions and Partners 3, Small Business",
    holder: "NITAAC, National Institutes of Health",
    number: "75N98120D00062",
    status: "active",
    detail: [
      { label: "Contract number", value: "75N98120D00062" },
      { label: "Track", value: "Small Business" },
      { label: "Order types", value: "FFP, CPFF, CPAF, CPIF, T&M" },
    ],
    summary:
      "A government-wide IDIQ usable by any U.S. Government agency, including the Department of Defense, across a broad range of IT requirements. The Navy identified CIO-SP3 Small Business as a preferred contracting vehicle in an April 2012 directive.",
    useIt:
      "Task orders may be issued as firm-fixed-price, cost-plus, or time-and-materials. Program management contact: Srinivas Moshugu, (913) 221-7204.",
  },
  {
    slug: "gsa-it-70",
    name: "GSA IT Schedule 70",
    full: "GSA Multiple Award Schedule, IT Category",
    holder: "U.S. General Services Administration",
    number: "47QTCA19D00FK",
    status: "expired",
    pop: "Jul 18, 2019 – Jul 17, 2024",
    detail: [
      { label: "Contract number", value: "47QTCA19D00FK" },
      { label: "Period of performance", value: "July 18, 2019 – July 17, 2024" },
    ],
    summary:
      "Schedule 70 covered IT services and products across 21 task areas for federal, state, and local buyers, and has since been consolidated into the GSA Multiple Award Schedule.",
    useIt:
      "This period of performance has ended. For GSA-routed requirements, contact us and we will confirm the current path — including partner and teaming arrangements — before you build an acquisition around it.",
  },
  {
    slug: "seaport-nxg",
    name: "SeaPort NxG",
    full: "SeaPort Next Generation",
    holder: "U.S. Navy",
    number: "N00178-18-R-7000",
    status: "expired",
    pop: "Jan 2, 2019 – Jan 1, 2024",
    detail: [
      { label: "Contract number", value: "N00178-18-R-7000" },
      { label: "Period of performance", value: "January 2, 2019 – January 1, 2024" },
    ],
    summary:
      "SeaPort is the Navy's electronic platform for acquiring support services across 22 functional areas, used by the Navy Systems Commands, Office of Naval Research, Military Sealift Command, and the Marine Corps.",
    useIt:
      "This period of performance has ended. Talk to us about current Navy pathways, including CIO-SP3 and 8(a), for the same functional areas.",
  },
];

export const activeVehicles = vehicles.filter((v) => v.status === "active");
