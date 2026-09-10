/**
 * Capability definitions.
 *
 * `factual` fields trace to sohumsystems.com. Narrative fields (problem/approach/
 * outcomes) are original positioning copy built on those facts — they describe how
 * the work is done without asserting tools, clients, or metrics the source lacks.
 */

export type Capability = {
  slug: string;
  name: string;
  short: string;
  /** One-line summary used in grids and nav. */
  blurb: string;
  /** Domain grouping for the capability architecture diagram. */
  pillar: "Engineer" | "Modernize" | "Decide" | "Deliver";
  /** The agency-side problem, stated plainly. */
  problem: string;
  /** How Sohum works the problem. */
  approach: string[];
  /** Discrete services under this capability. */
  services: string[];
  /** Mission context — general, non-attributed. */
  mission: string;
  /** What the agency gets. */
  outcomes: string[];
  /** Only credentials/technologies the source supports. */
  credentials?: string[];
  /** Closing CTA headline, written per capability so articles read naturally. */
  ctaTitle: string;
  metaDescription: string;
};

export const capabilities: Capability[] = [
  {
    slug: "custom-application-development",
    name: "Custom Application Development",
    short: "App Development",
    blurb: "Tailored software for mission workflows that commercial products do not fit.",
    pillar: "Engineer",
    problem:
      "Mission workflows rarely match a commercial product's assumptions. Agencies end up bending the mission around the software, or maintaining a thicket of spreadsheets and manual handoffs beside it. Both options quietly raise cost and risk every year they continue.",
    approach: [
      "Start from the workflow, not the wireframe. We map how the work actually moves — including the exceptions people handle by hand — before proposing a system boundary.",
      "Build in vertical slices. Each increment is a working, demonstrable path through the system, so stakeholders steer with software rather than status decks.",
      "Design for the sustainment team from day one: readable code, documented interfaces, and automated tests that let the next developer change things safely.",
      "Treat accessibility and security as acceptance criteria, not a hardening phase bolted on before launch.",
    ],
    services: [
      "Full-stack web application design and development",
      "Legacy application re-platforming and re-architecture",
      "API design, integration, and service interfaces",
      "Responsive and accessible user interfaces",
      "Application maintenance and sustainment",
      "Technical documentation and knowledge transfer",
    ],
    mission:
      "Federal program offices carry application portfolios spanning decades of technology. The pressure is to modernize without interrupting a mission that runs every day — which makes incremental, well-tested delivery a requirement rather than a preference.",
    outcomes: [
      "Software that fits the mission workflow instead of forcing workarounds",
      "A codebase your team or the next contractor can maintain",
      "Reduced manual effort and fewer sources of error",
      "Working software demonstrated on a predictable cadence",
    ],
    ctaTitle:
      "Have an application that no longer fits the mission?",
    metaDescription:
      "Custom application development for federal agencies — full-stack engineering, legacy re-platforming, API integration, and application sustainment from an SBA 8(a), CMMI Level 3 firm.",
  },
  {
    slug: "cloud-services-migration",
    name: "Cloud Services & Migration",
    short: "Cloud",
    blurb: "Cloud-native builds and legacy migration, from lift-and-shift to full modernization.",
    pillar: "Modernize",
    problem:
      "A cloud mandate is not a cloud strategy. Moved without change, a legacy application often costs more in the cloud than it did in the data center. Rewritten all at once, it stalls. The judgment call is which applications deserve which treatment.",
    approach: [
      "Assess the portfolio application by application and recommend a disposition for each: lift-and-shift, re-platform, modernize, or retire.",
      "Migrate the straightforward workloads first to build capability and credibility, then apply the savings to the applications that need real re-architecture.",
      "Design cloud-native systems that use managed services deliberately — scaling and resilience should come from the platform, not from custom code.",
      "Make the cost model visible early, so the modernization case rests on numbers rather than assumptions.",
    ],
    services: [
      "Cloud readiness and application portfolio assessment",
      "Lift-and-shift migration of legacy applications",
      "Application modernization and re-architecture",
      "Green-field cloud-native solution design",
      "Infrastructure as code and environment automation",
      "Post-migration optimization and cost management",
    ],
    mission:
      "Cloud migration in a federal context carries constraints commercial migrations do not: authorization boundaries, continuous monitoring, and data residency. Sequencing the work around those realities is what keeps a migration on schedule.",
    outcomes: [
      "A defensible, application-by-application migration plan",
      "Elastic capacity in place of fixed infrastructure",
      "Cost visibility before and after the move",
      "Modernization paced so the mission keeps running",
    ],
    credentials: ["Amazon-certified systems architects", "Oracle-certified systems architects"],
    ctaTitle:
      "Weighing a cloud migration?",
    metaDescription:
      "Federal cloud migration and modernization — portfolio assessment, lift-and-shift, re-architecture, and cloud-native development with Amazon and Oracle certified architects.",
  },
  {
    slug: "artificial-intelligence-data-analytics",
    name: "Artificial Intelligence & Data Analytics",
    short: "AI & Analytics",
    blurb: "Production-ready AI and machine learning models, governed and trained at scale.",
    pillar: "Decide",
    problem:
      "Most agency AI work stops at the pilot. A promising model is demonstrated, and then it never reaches the people doing the work, because nobody planned for monitoring, retraining, data lineage, or the question of who is accountable when the model is wrong.",
    approach: [
      "Frame the decision before the model. If a human cannot say what they would do differently given the output, the model is not ready to be built.",
      "Establish a framework for reliable AI and machine learning innovation — data lineage, evaluation criteria, and human review defined before training starts.",
      "Build for production from the start: versioned data, reproducible training, monitored inference, and a documented retraining path.",
      "Keep a person in the loop wherever the decision affects a citizen, a benefit, or a compliance outcome.",
    ],
    services: [
      "AI and machine learning model development",
      "Production ML pipelines and model operations",
      "AI readiness assessment and use-case triage",
      "Advanced and predictive analytics",
      "Data quality, preparation, and feature engineering",
      "Model evaluation, monitoring, and governance",
    ],
    mission:
      "Federal AI adoption is judged on explainability and accountability as much as accuracy. Models that inform public-facing decisions must be documented, testable, and reviewable — which is a data engineering problem long before it is a modeling problem.",
    outcomes: [
      "Models that reach production, not just a pilot report",
      "Documented lineage and evaluation for oversight review",
      "Analysts working from evidence at machine scale",
      "A governed path to retrain as data shifts",
    ],
    credentials: ["Production AI/ML models trained on billions of records"],
    ctaTitle:
      "Have an AI pilot that never reached production?",
    metaDescription:
      "Artificial intelligence and data analytics for government — production-ready AI/ML models, ML operations, predictive analytics, and AI governance frameworks.",
  },
  {
    slug: "geographic-information-systems",
    name: "Geographic Information Systems",
    short: "GIS",
    blurb: "Enterprise GIS and interactive web mapping that turn spatial data into decisions.",
    pillar: "Decide",
    problem:
      "Spatial data is often the most valuable and least usable asset an agency holds — locked in desktop tools, guarded by a handful of specialists, and disconnected from the systems where decisions actually get made.",
    approach: [
      "Build enterprise GIS (EGIS) platforms that serve authoritative spatial data to whole organizations, not to a single analyst's desktop.",
      "Deliver mapping through the browser, so field staff, program analysts, and leadership all work from the same current picture.",
      "Integrate spatial data with the business systems of record, so location becomes a dimension of the analysis instead of a separate exercise.",
      "Model the data so trends and correlations across geography are queryable rather than rediscovered by hand each time.",
    ],
    services: [
      "Enterprise GIS (EGIS) architecture and implementation",
      "Interactive web mapping application development",
      "Spatial data management and modeling",
      "Geospatial analysis and correlation",
      "GIS integration with enterprise systems",
      "Spatial data quality and stewardship",
    ],
    mission:
      "Land, agriculture, transportation, and natural resource programs are inherently geographic. When mapping is available to everyone in the program — not only to the GIS office — resource allocation and field operations improve directly.",
    outcomes: [
      "Authoritative spatial data available across the organization",
      "Mapping in the browser for field and headquarters alike",
      "Location integrated into everyday program analysis",
      "Better-targeted resource and field decisions",
    ],
    credentials: [
      "GISCI-certified GIS professionals",
      "Esri-certified GIS professionals",
      "Interactive web mapping delivered for the U.S. Department of Agriculture",
    ],
    ctaTitle:
      "Have spatial data your program cannot reach?",
    metaDescription:
      "Enterprise GIS and web mapping for federal agencies — EGIS architecture, spatial data management, and geospatial analysis by GISCI and Esri certified professionals.",
  },
  {
    slug: "data-warehousing",
    name: "Data Warehousing",
    short: "Data Warehousing",
    blurb: "Secure, scalable warehouses that give an organization one unified view.",
    pillar: "Decide",
    problem:
      "When every program office maintains its own extract, leadership meetings turn into arguments about whose number is right. The reconciliation work is invisible, expensive, and repeated every reporting cycle.",
    approach: [
      "Model the warehouse around the questions the organization has to answer, so the schema serves reporting rather than mirroring source systems.",
      "Build ingestion that is scheduled, monitored, and recoverable — a pipeline nobody trusts is a pipeline nobody uses.",
      "Make data quality measurable at the point of load, with rules and exception reporting instead of downstream cleanup.",
      "Enforce access control and auditability in the warehouse itself, not in the reporting tools layered above it.",
    ],
    services: [
      "Data warehouse architecture and dimensional modeling",
      "ETL and ELT pipeline development",
      "Data consolidation across program systems",
      "Data quality rules and exception reporting",
      "Reporting and dashboard delivery",
      "Warehouse performance tuning and scaling",
    ],
    mission:
      "Federal reporting obligations — to Congress, to OMB, to the public — depend on numbers that hold up under audit. A governed warehouse is what makes a reported figure defensible months after it was published.",
    outcomes: [
      "A single unified view across program systems",
      "Reporting cycles measured in hours, not weeks",
      "Data quality visible and managed, not assumed",
      "Figures that hold up under audit and oversight",
    ],
    credentials: ["Data warehouses delivered for the U.S. Department of Agriculture"],
    ctaTitle:
      "Tired of reconciling numbers across systems?",
    metaDescription:
      "Federal data warehousing services — dimensional modeling, ETL pipelines, data quality management, and reporting on secure, scalable architectures.",
  },
  {
    slug: "business-intelligence",
    name: "Business Intelligence",
    short: "Business Intelligence",
    blurb: "Real-time indicators and trends that put evidence in front of decision makers.",
    pillar: "Decide",
    problem:
      "Dashboards proliferate while decisions stay slow. The usual cause is that the dashboard answers what was easy to chart rather than what the decision maker actually has to choose between.",
    approach: [
      "Start with the decision and its cadence. A weekly resource-allocation call needs a different instrument than a quarterly report to oversight.",
      "Design for the glance: the most important indicator is legible in seconds, with the supporting detail one interaction away.",
      "Give every metric a definition, an owner, and a source — so a number in a briefing can be traced without a research project.",
      "Retire dashboards deliberately. Fewer, trusted instruments beat a library nobody opens.",
    ],
    services: [
      "KPI definition and metric governance",
      "Executive and operational dashboard design",
      "Self-service analytics enablement",
      "Trend analysis and performance reporting",
      "BI platform implementation and integration",
      "Report rationalization and consolidation",
    ],
    mission:
      "Program managers are accountable for outcomes on a schedule set outside their office. Real-time visibility into performance indicators is what turns a quarterly surprise into a manageable adjustment.",
    outcomes: [
      "Real-time access to key performance indicators and trends",
      "Metrics with agreed definitions and clear ownership",
      "Fewer, better-trusted dashboards in active use",
      "Decisions made on evidence rather than anecdote",
    ],
    ctaTitle:
      "Have dashboards nobody uses?",
    metaDescription:
      "Business intelligence for government — KPI governance, executive dashboards, self-service analytics, and performance reporting that support data-driven decisions.",
  },
  {
    slug: "devops",
    name: "DevOps",
    short: "DevOps",
    blurb: "Automated pipelines and environments that make delivery routine rather than eventful.",
    pillar: "Engineer",
    problem:
      "When a release takes a weekend and a bridge call, teams release rarely. Batches grow, risk concentrates, and the deployment itself becomes the most dangerous moment in the lifecycle — the opposite of the intended effect.",
    approach: [
      "Automate the path to production first: build, test, and deploy as one repeatable pipeline with no manual steps to forget.",
      "Define environments as code so development, test, and production differ by configuration rather than by history.",
      "Shift security and compliance checks into the pipeline, where a finding is a build result instead of a late-stage surprise.",
      "Instrument what you ship. Delivery speed only helps if you can see the effect of a release and reverse it quickly.",
    ],
    services: [
      "CI/CD pipeline design and implementation",
      "Infrastructure as code and configuration management",
      "Environment provisioning and management",
      "Release automation and deployment strategy",
      "Monitoring, logging, and observability",
      "DevSecOps practice and toolchain integration",
    ],
    mission:
      "Continuous delivery and continuous authorization pull in the same direction: both depend on automated evidence. Pipelines that produce test and security artifacts as a by-product make the compliance conversation shorter.",
    outcomes: [
      "Releases that are routine instead of high-risk events",
      "Environments that match, so defects surface early",
      "Security findings caught in the pipeline",
      "Faster recovery when something does go wrong",
    ],
    credentials: ["DevSecOps architecture leadership"],
    ctaTitle:
      "Are releases the riskiest day in your lifecycle?",
    metaDescription:
      "DevOps and DevSecOps for federal programs — CI/CD pipelines, infrastructure as code, release automation, and observability that make delivery repeatable.",
  },
  {
    slug: "test-automation",
    name: "Test Automation",
    short: "Test Automation",
    blurb: "Automated quality engineering that makes regression risk measurable.",
    pillar: "Engineer",
    problem:
      "Manual regression testing sets a hard floor on release frequency and gets cut first when a schedule tightens — precisely when the risk of skipping it is highest.",
    approach: [
      "Automate at the level that gives the clearest signal: fast unit and integration coverage underneath, a thin layer of end-to-end tests for the paths that matter most.",
      "Treat test code as production code — reviewed, refactored, and owned. A flaky suite is worse than no suite, because it teaches the team to ignore failures.",
      "Build accessibility and performance checks into the same automated run, so quality is one gate rather than several disconnected ones.",
      "Report coverage and defect trends in terms a program manager can act on.",
    ],
    services: [
      "Test automation strategy and framework design",
      "Functional and regression suite development",
      "API and integration test automation",
      "Performance and load testing",
      "Accessibility testing and remediation support",
      "Quality metrics and defect trend reporting",
    ],
    mission:
      "Public-facing government systems are held to accessibility and reliability standards that are not negotiable. Automated verification is the only affordable way to hold that line release after release.",
    outcomes: [
      "Regression risk measured rather than hoped about",
      "Release cycles no longer gated by manual testing",
      "Accessibility verified continuously, not audited late",
      "Defects found closer to when they were introduced",
    ],
    ctaTitle:
      "Is manual regression testing setting your release pace?",
    metaDescription:
      "Test automation services for government software — automation frameworks, regression and API suites, performance testing, and accessibility verification.",
  },
  {
    slug: "program-project-management",
    name: "Program & Project Management",
    short: "Program Management",
    blurb: "Certified program leadership that keeps scope, risk, and schedule under control.",
    pillar: "Deliver",
    problem:
      "Programs rarely fail on a single decision. They drift — an unresolved dependency here, an unowned risk there — until the schedule is no longer recoverable and the reporting no longer reflects reality.",
    approach: [
      "Establish one plan of record with named owners, so status reflects the work rather than the reporting cycle.",
      "Manage risk as an active register with mitigations, triggers, and owners — reviewed on a cadence, not assembled for a milestone review.",
      "Report against baseline in terms of cost, schedule, and delivered scope, including the variances that are inconvenient.",
      "Keep the government program manager positioned to make decisions early, while options remain open and cheap.",
    ],
    services: [
      "Program and project management (PMI-aligned)",
      "Agile delivery and Scrum team leadership",
      "Scaled agile program coordination",
      "Risk, issue, and dependency management",
      "Schedule development and baseline control",
      "Stakeholder communication and executive reporting",
    ],
    mission:
      "Federal programs answer to oversight bodies on a fixed rhythm. Disciplined management is what makes those reviews a confirmation of what the program office already knew rather than a discovery exercise.",
    outcomes: [
      "Objectives met on schedule and within budget",
      "Risks surfaced while they are still cheap to mitigate",
      "Status that reflects the work, including bad news",
      "Decisions made early, with options still open",
    ],
    credentials: [
      "PMI-certified project managers",
      "PMP-certified operations leadership",
      "SAFe and Scrum Alliance frameworks",
    ],
    ctaTitle:
      "Need a program brought back under control?",
    metaDescription:
      "Program and project management for federal agencies — PMI-certified managers, agile delivery leadership, risk management, and executive reporting.",
  },
  {
    slug: "enterprise-resource-planning",
    name: "Enterprise Resource Planning",
    short: "ERP",
    blurb: "ERP implementation and integration that connect back-office systems to the mission.",
    pillar: "Modernize",
    problem:
      "ERP programs fail on process and data far more often than on software. The system goes live technically correct and organizationally rejected, because the work of reconciling how people actually operate was deferred.",
    approach: [
      "Resolve the process questions before configuration. Where the organization needs to change, say so early and plan for it.",
      "Treat data migration as a first-class workstream with its own quality gates — legacy data is almost always worse than believed.",
      "Integrate ERP with the systems of record around it, so the back office stops re-keying between platforms.",
      "Invest in training and adoption support, because an ERP nobody uses correctly is an expensive filing cabinet.",
    ],
    services: [
      "ERP requirements definition and process design",
      "ERP implementation and configuration support",
      "Data migration, cleansing, and reconciliation",
      "Integration with enterprise and financial systems",
      "Workflow automation across back-office functions",
      "User training and adoption support",
    ],
    mission:
      "Administrative and financial operations are where federal programs meet their compliance obligations. Integrated back-office systems reduce both the reporting burden and the audit exposure that comes with manual reconciliation.",
    outcomes: [
      "Back-office processes designed before they are configured",
      "Migrated data that reconciles to the legacy system",
      "Manual re-keying between systems eliminated",
      "A system the organization actually adopts",
    ],
    ctaTitle:
      "Planning an ERP implementation?",
    metaDescription:
      "Enterprise resource planning services — ERP implementation support, process design, data migration, system integration, and workflow automation for government.",
  },
  {
    slug: "administrative-support",
    name: "Administrative Support",
    short: "Admin Support",
    blurb: "Workflow automation, compliance reporting, and digital library and hosting services.",
    pillar: "Deliver",
    problem:
      "Administrative burden is rarely one large problem. It is hundreds of small manual steps — rekeyed forms, reconciled spreadsheets, assembled reports — that quietly consume the capacity of skilled staff.",
    approach: [
      "Find the repetitive, rule-based steps and automate those first, where the return is immediate and the risk is low.",
      "Build data fidelity checks into the workflow so errors are caught at entry instead of during reporting.",
      "Standardize recurring reporting so compliance products assemble themselves from governed data.",
      "Keep documentation and digital library services organized so information can be found when it is needed.",
    ],
    services: [
      "Workflow automation and process streamlining",
      "Data fidelity and compliance reporting",
      "Digital library and records services",
      "Web hosting and cloud service management",
      "Hardware and software asset management",
      "Scheduling, collaboration, and staffing support",
    ],
    mission:
      "Support functions determine how much of an agency's capacity reaches the mission. Automating administrative overhead returns skilled staff time to the work only they can do.",
    outcomes: [
      "Manual administrative steps removed from daily work",
      "Compliance reporting produced from governed data",
      "Records and documents findable when needed",
      "Skilled staff time returned to mission work",
    ],
    ctaTitle:
      "Losing skilled staff time to manual administrative work?",
    metaDescription:
      "Administrative support services for federal agencies — workflow automation, compliance reporting, digital library services, hosting, and asset management.",
  },
];

export const pillars = [
  {
    id: "Engineer",
    label: "Engineer",
    description: "Build and sustain the software the mission runs on.",
  },
  {
    id: "Modernize",
    label: "Modernize",
    description: "Move legacy systems to modern platforms without stopping the mission.",
  },
  {
    id: "Decide",
    label: "Decide",
    description: "Turn agency data into evidence people act on.",
  },
  {
    id: "Deliver",
    label: "Deliver",
    description: "Lead programs and support operations so outcomes land.",
  },
] as const;

export function getCapability(slug: string) {
  return capabilities.find((c) => c.slug === slug);
}

export function capabilitiesByPillar(pillar: string) {
  return capabilities.filter((c) => c.pillar === pillar);
}
