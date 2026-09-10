/**
 * Location pages.
 *
 * These exist to answer real local searches ("IT company Overland Park",
 * "federal IT contractor Kansas City"). Every claim below is grounded in the
 * same verified facts as the rest of the site — headquarters, 8(a) status,
 * CMMI appraisal, USDA/FSA past performance, and the office locations listed
 * on current job postings. No superlatives, no invented client counts.
 */

export type Location = {
  slug: string;
  /** Short name used in nav and breadcrumbs. */
  name: string;
  /** Full "City, ST" for headings and schema. */
  full: string;
  region: string;
  /** The page's H1. */
  heading: string;
  lede: string;
  /** Why a buyer here should care — grounded, specific. */
  body: string[];
  /** Nearby areas served, for genuine local relevance. */
  serves: string[];
  metaTitle: string;
  metaDescription: string;
};

export const locations: Location[] = [
  {
    slug: "overland-park",
    name: "Overland Park",
    full: "Overland Park, KS",
    region: "Kansas",
    heading: "An IT and software company headquartered in Overland Park, Kansas.",
    lede:
      "Sohum Systems has been based in Overland Park since 2013, delivering custom software, cloud migration, data platforms, and GIS to federal, state, and commercial customers.",
    body: [
      "Our headquarters is at 9232 W 143rd Terrace in Overland Park, and our engineering teams work from the greater Kansas City area. That matters more than it sounds: the people who scope your work are the people who deliver it, and they are reachable in your time zone.",
      "We are an SBA-certified 8(a) small business appraised at CMMI Level 3 for both Development and Services, and certified to ISO 9001, ISO/IEC 20000-1, and ISO/IEC 27001. For a public-sector buyer in Kansas, that combination means a local supplier whose delivery processes have been audited by an outside body rather than self-declared.",
      "Our federal work centres on the U.S. Department of Agriculture and its Farm Service Agency, where we build interactive web mapping applications, business intelligence dashboards, and data warehouses used by program staff nationwide.",
    ],
    serves: [
      "Overland Park",
      "Leawood",
      "Olathe",
      "Lenexa",
      "Shawnee",
      "Prairie Village",
      "Johnson County",
    ],
    metaTitle: "IT & Software Company in Overland Park, KS",
    metaDescription:
      "Sohum Systems is an IT and software company headquartered in Overland Park, Kansas — custom application development, cloud migration, data analytics, and GIS. SBA 8(a) certified, CMMI Level 3 appraised.",
  },
  {
    slug: "kansas-city",
    name: "Kansas City",
    full: "Kansas City metro",
    region: "Kansas & Missouri",
    heading: "Software engineering and IT services for the Kansas City metro.",
    lede:
      "We are a Kansas City-area technology firm building custom applications, cloud platforms, and data systems for government and commercial organizations on both sides of the state line.",
    body: [
      "Sohum Systems was founded in the Kansas City area in 2013 and has grown here since. Our teams work from Overland Park and across the metro, including Kansas City, Missouri, and we hire locally for engineering, quality, and program delivery roles.",
      "For organizations in the metro, working with a local firm means working with engineers you can meet. We keep a flat structure and low overhead deliberately, so decisions do not queue behind management layers and the rate you pay is not carrying a corporate campus.",
      "Our capabilities span custom application development, cloud migration and modernization, AI and data analytics, enterprise GIS, data warehousing, business intelligence, DevOps, test automation, ERP, and program management — delivered under CMMI Level 3 appraised processes.",
    ],
    serves: [
      "Kansas City, MO",
      "Kansas City, KS",
      "Overland Park",
      "Independence",
      "Lee's Summit",
      "Johnson County",
      "Jackson County",
    ],
    metaTitle: "IT Company & Software Development in Kansas City",
    metaDescription:
      "Kansas City software engineering and IT services — custom application development, cloud modernization, data analytics, and GIS. Locally headquartered, SBA 8(a) certified, CMMI Level 3 appraised.",
  },
  {
    slug: "kansas",
    name: "Kansas",
    full: "Kansas",
    region: "Kansas",
    heading: "A Kansas IT company delivering to federal and commercial customers.",
    lede:
      "Headquartered in Overland Park, Sohum Systems provides software engineering, cloud modernization, data analytics, and GIS services to organizations across Kansas and nationwide.",
    body: [
      "Kansas organizations working with a federal or state technology requirement often face the same trade-off: a large integrator with process and layers of it, or a small firm with speed and, too often, improvisation. We are built to give buyers both — a lean team you can reach, running processes that have been formally appraised.",
      "We hold SBA 8(a) certification, which lets contracting officers award to us directly within program thresholds, and we are appraised at CMMI Level 3 for Development and for Services. Our information security management system is certified to ISO/IEC 27001.",
      "We are also a NASA SEWP VI Category A contract holder and hold CIO-SP3 Small Business, giving agencies government-wide pathways to put a Kansas-based team under contract.",
    ],
    serves: [
      "Overland Park",
      "Kansas City",
      "Topeka",
      "Wichita",
      "Lawrence",
      "Olathe",
      "Statewide",
    ],
    metaTitle: "Kansas IT Company — Federal & Commercial Technology Services",
    metaDescription:
      "Sohum Systems is a Kansas IT company headquartered in Overland Park, delivering software development, cloud migration, AI and data analytics, and GIS. SBA 8(a), CMMI Level 3, ISO certified.",
  },
];

export const getLocation = (slug: string) => locations.find((l) => l.slug === slug);
