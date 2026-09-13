/**
 * Seeds a set of realistic open positions for local testing.
 *
 *   npm run seed:jobs              # add any that are missing
 *   npm run seed:jobs -- --reset   # remove seeded jobs with no applications first
 *
 * Deliberately separate from the migrations: this is test data, never
 * reference data, and nothing in the application depends on it existing.
 *
 * Every role below is written the way a real posting is — a summary that reads
 * as a sentence, responsibilities that describe the work rather than the title,
 * and qualifications that could actually be screened against. The point is to
 * exercise the ATS with content that looks like production, not "Job 1".
 *
 * Safety: refuses to run against a database whose URL does not look local
 * unless SEED_ALLOW_REMOTE=1 is set, so it cannot quietly populate production.
 */
import { sql, eq, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

type Seed = {
  title: string;
  department: string;
  location: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "INTERNSHIP";
  remoteType: "ON_SITE" | "HYBRID" | "REMOTE";
  experienceLevel: "ENTRY" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL";
  salaryRange: string;
  summary: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  preferredQualifications: string[];
  skills: string[];
};

const KC = "Overland Park, KS";
const KCMO = "Kansas City, MO";

export const seedJobs: Seed[] = [
  {
    title: "Senior Java Developer",
    department: "Software Engineering",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "SENIOR",
    salaryRange: "$120,000 – $150,000",
    summary:
      "Build and sustain the Java services behind federal case-management systems used daily by program staff.",
    description:
      "You will work on long-lived Spring Boot services that federal program staff depend on to do their jobs. The systems are real, the users are real, and the code you write stays in service for years — so we care more about clarity and test coverage than clever abstractions.",
    responsibilities: [
      "Design, build and maintain Spring Boot services backed by PostgreSQL and Oracle",
      "Take features from a written requirement through design, implementation, test and release",
      "Write unit and integration tests that give the team confidence to deploy on a Thursday",
      "Review peers' pull requests with substance rather than approval-by-default",
      "Diagnose production issues, write the fix and the regression test that keeps it fixed",
      "Work directly with government product owners to turn a stated need into a shipped change",
    ],
    qualifications: [
      "5+ years building production Java applications",
      "Strong Spring Boot, Spring Data and REST API experience",
      "Proficient with relational databases and able to read and tune a query plan",
      "Comfortable with Git, CI pipelines and code review as a daily habit",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Experience on a federal programme or in another regulated environment",
      "Kafka or another message broker in production",
      "An active or prior public trust or security clearance",
    ],
    skills: ["Java", "Spring Boot", "PostgreSQL", "REST APIs", "JUnit", "Maven", "Git"],
  },
  {
    title: "Cloud Infrastructure Engineer",
    department: "Cloud Services",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "SENIOR",
    salaryRange: "$125,000 – $155,000",
    summary:
      "Design and run the AWS GovCloud infrastructure that federal workloads are migrated onto.",
    description:
      "We move federal systems out of ageing data centres and onto AWS GovCloud, then keep them running. This role owns the infrastructure that makes that possible — defined in code, reproducible, and documented well enough that the next engineer can follow it.",
    responsibilities: [
      "Define and maintain infrastructure as code with Terraform across multiple accounts",
      "Build and operate ECS and EKS workloads, including autoscaling and rollout strategy",
      "Design VPC networking, security groups and IAM so least privilege is the default",
      "Automate patching, backup and disaster-recovery procedures and prove they work",
      "Instrument systems with CloudWatch and act on what the telemetry says",
      "Support ATO and FedRAMP evidence collection with accurate architecture documentation",
    ],
    qualifications: [
      "4+ years operating AWS in production",
      "Strong Terraform and at least one scripting language",
      "Solid grounding in Linux administration and networking fundamentals",
      "Experience with containers and a container orchestrator",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "AWS GovCloud or another regulated cloud environment",
      "AWS Solutions Architect or DevOps Engineer certification",
      "Familiarity with FedRAMP or NIST 800-53 controls",
    ],
    skills: ["AWS", "Terraform", "Docker", "Kubernetes", "Linux", "Python", "CloudWatch"],
  },
  {
    title: "DevOps Engineer",
    department: "Cloud Services",
    location: "Remote (United States)",
    employmentType: "FULL_TIME",
    remoteType: "REMOTE",
    experienceLevel: "MID",
    salaryRange: "$105,000 – $130,000",
    summary:
      "Own the build, test and release pipelines that get our teams' work safely into production.",
    description:
      "Delivery teams here release often, and that only works when the pipeline is fast and trustworthy. You will own that pipeline end to end: how code is built, how it is verified, and how it reaches an environment without anyone holding their breath.",
    responsibilities: [
      "Build and maintain CI/CD pipelines in GitHub Actions and GitLab CI",
      "Automate deployments so a release is a routine event rather than a project",
      "Introduce and maintain static analysis, dependency and container scanning in the pipeline",
      "Manage secrets and configuration across environments without copying them by hand",
      "Cut build times and flaky tests, and keep them cut",
      "Write the runbooks that let someone else operate what you built",
    ],
    qualifications: [
      "3+ years in a DevOps, SRE or platform engineering role",
      "Hands-on CI/CD pipeline authorship, not just usage",
      "Strong shell scripting plus Python or Go",
      "Practical Docker experience and an understanding of image hygiene",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Kubernetes in production",
      "HashiCorp Vault or AWS Secrets Manager",
      "Experience meeting federal security scanning requirements",
    ],
    skills: ["GitHub Actions", "Docker", "Kubernetes", "Bash", "Python", "Terraform", "Ansible"],
  },
  {
    title: "Principal Quality Engineer",
    department: "Quality Engineering",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "PRINCIPAL",
    salaryRange: "$135,000 – $165,000",
    summary:
      "Set the quality and test-automation strategy across delivery teams, and build the frameworks that make it real.",
    description:
      "This is a hands-on technical leadership role. You will decide how we test across several programmes, then write the frameworks and harnesses that make that strategy something teams actually use rather than a document they were sent.",
    responsibilities: [
      "Define enterprise quality engineering and test automation strategy",
      "Design and build automation frameworks for web, API and mobile surfaces",
      "Establish quality gates, coverage targets and the metrics that show whether they hold",
      "Drive shift-left practices so defects are found at the pull request, not in staging",
      "Lead root-cause analysis on production defects and close the gaps that allowed them",
      "Mentor QA engineers and automation engineers across teams",
    ],
    qualifications: [
      "10+ years in software quality engineering or test automation",
      "Proven design of automation frameworks from scratch",
      "Strong programming in Java, JavaScript or TypeScript",
      "Deep experience with Selenium, Playwright, Cypress or comparable tools",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Performance testing with JMeter or k6",
      "Accessibility testing against Section 508 and WCAG 2.1 AA",
      "Experience introducing automation into a team that had none",
    ],
    skills: ["Playwright", "Selenium", "TypeScript", "Java", "REST Assured", "CI/CD", "JMeter"],
  },
  {
    title: "Data Engineer",
    department: "Data & Analytics",
    location: KCMO,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "MID",
    salaryRange: "$110,000 – $135,000",
    summary:
      "Build the pipelines that turn federal operational data into something analysts can actually use.",
    description:
      "Agencies hold enormous amounts of data in formats nobody designed for analysis. You will build the pipelines that extract, reshape and land it somewhere trustworthy, with the lineage and quality checks that let people rely on the result.",
    responsibilities: [
      "Build batch and streaming pipelines with Python, SQL and Apache Airflow",
      "Model warehouse schemas that answer the questions analysts actually ask",
      "Implement data quality checks and surface failures before a dashboard does",
      "Optimise queries and storage for cost as well as speed",
      "Document lineage so a number in a report can be traced back to its source",
      "Partner with analysts and data scientists on what the data needs to support",
    ],
    qualifications: [
      "3+ years building production data pipelines",
      "Strong SQL and Python",
      "Experience with a workflow orchestrator such as Airflow or Dagster",
      "Dimensional modelling and warehouse design experience",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Redshift, Snowflake or BigQuery at scale",
      "dbt for transformation and testing",
      "Spark or another distributed processing framework",
    ],
    skills: ["Python", "SQL", "Airflow", "dbt", "Redshift", "Spark", "AWS Glue"],
  },
  {
    title: "Business Intelligence Analyst",
    department: "Data & Analytics",
    location: KCMO,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "MID",
    salaryRange: "$95,000 – $120,000",
    summary:
      "Turn programme data into dashboards and analysis that federal managers use to make decisions.",
    description:
      "You will sit close to the people asking the questions. The work is equal parts understanding what a programme manager actually needs to know, finding whether the data can answer it, and building something they will still be using in six months.",
    responsibilities: [
      "Build and maintain dashboards in Power BI and Tableau",
      "Translate programme questions into data models and measures",
      "Write and tune the SQL behind reports and extracts",
      "Validate figures against source systems before anyone presents them",
      "Train users so a dashboard outlives the person who built it",
      "Document definitions so two reports do not disagree about what a metric means",
    ],
    qualifications: [
      "3+ years in business intelligence or data analysis",
      "Strong Power BI or Tableau, including data modelling rather than only visuals",
      "Confident SQL against large relational datasets",
      "Able to present findings clearly to a non-technical audience",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "DAX or Tableau calculated fields at an advanced level",
      "Federal programme reporting experience",
      "Familiarity with Section 508 accessible reporting",
    ],
    skills: ["Power BI", "Tableau", "SQL", "DAX", "Excel", "Data modelling"],
  },
  {
    title: "GIS Analyst",
    department: "Geospatial Solutions",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "ON_SITE",
    experienceLevel: "MID",
    salaryRange: "$85,000 – $110,000",
    summary:
      "Produce the spatial analysis and mapping products federal programmes rely on for planning decisions.",
    description:
      "Our geospatial work supports land management, infrastructure and emergency planning. You will handle data that is often messy and inherited, make it usable, and produce analysis and cartography people act on.",
    responsibilities: [
      "Perform spatial analysis with ArcGIS Pro and QGIS",
      "Build and maintain geodatabases, including topology and quality rules",
      "Automate repetitive geoprocessing with Python and ArcPy",
      "Produce cartographic products fit for publication and briefing",
      "Integrate spatial data with enterprise systems and web mapping services",
      "Document methodology so an analysis can be reproduced later",
    ],
    qualifications: [
      "3+ years in a GIS analyst role",
      "Strong ArcGIS Pro and geodatabase experience",
      "Python and ArcPy scripting",
      "Sound grasp of projections, datums and spatial accuracy",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "ArcGIS Enterprise or ArcGIS Online administration",
      "Remote sensing or LiDAR processing",
      "GISP certification",
    ],
    skills: ["ArcGIS Pro", "QGIS", "PostGIS", "Python", "ArcPy", "Cartography"],
  },
  {
    title: "Cybersecurity Analyst",
    department: "Cybersecurity",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "ON_SITE",
    experienceLevel: "MID",
    salaryRange: "$110,000 – $140,000",
    summary:
      "Monitor, assess and harden federal systems against a threat landscape that does not stand still.",
    description:
      "You will work across monitoring, assessment and compliance — watching what is happening now, testing what could happen, and producing the evidence that keeps systems authorised to operate.",
    responsibilities: [
      "Monitor security events and triage alerts from SIEM tooling",
      "Run vulnerability scans and drive remediation with system owners",
      "Support ATO packages and continuous monitoring under RMF",
      "Map controls to NIST 800-53 and produce the evidence assessors ask for",
      "Participate in incident response, containment and written post-incident review",
      "Advise engineering teams on secure design before code is written",
    ],
    qualifications: [
      "3+ years in a cybersecurity or information assurance role",
      "Working knowledge of NIST 800-53, RMF and FISMA",
      "Experience with SIEM and vulnerability scanning tooling",
      "Clear technical writing — assessment findings must stand on their own",
      "US citizenship, required for this programme",
    ],
    preferredQualifications: [
      "Security+, CySA+ or CISSP",
      "Active or prior security clearance",
      "Cloud security posture management experience",
    ],
    skills: ["NIST 800-53", "RMF", "Splunk", "Nessus", "Incident response", "FISMA"],
  },
  {
    title: "Full Stack Developer",
    department: "Software Engineering",
    location: "Remote (United States)",
    employmentType: "FULL_TIME",
    remoteType: "REMOTE",
    experienceLevel: "MID",
    salaryRange: "$100,000 – $130,000",
    summary:
      "Build accessible, responsive web applications end to end, from the database through to the interface.",
    description:
      "You will own features rather than layers. That means designing the data model, writing the API, building the interface, and making sure the result is accessible to every user — which for federal work is a legal requirement, not an aspiration.",
    responsibilities: [
      "Build features end to end with React, TypeScript and Node.js",
      "Design REST APIs and the relational schemas behind them",
      "Meet Section 508 and WCAG 2.1 AA, and verify it with real assistive technology",
      "Write tests at the level that catches the bug, not the level that inflates coverage",
      "Participate in design and code review",
      "Support your own features in production",
    ],
    qualifications: [
      "3+ years building web applications in production",
      "Strong React and TypeScript",
      "Server-side experience with Node.js and a relational database",
      "Working knowledge of web accessibility",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Next.js or another server-rendering framework",
      "Experience on a federal or otherwise regulated application",
      "Design-system or component-library work",
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "WCAG", "Jest"],
  },
  {
    title: "Technical Program Manager",
    department: "Program Delivery",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "LEAD",
    salaryRange: "$125,000 – $155,000",
    summary:
      "Own delivery across engineering teams and be the person the government customer trusts for a straight answer.",
    description:
      "This role sits between the customer and the engineers. You will own scope, schedule and risk on a federal programme, and the measure of success is that neither side is ever surprised.",
    responsibilities: [
      "Own delivery schedule, scope and risk across multiple engineering teams",
      "Run the agile ceremonies that help and drop the ones that do not",
      "Serve as the primary technical point of contact for the government customer",
      "Track and report programme metrics, including the uncomfortable ones",
      "Identify risks early and drive them to a decision rather than a status colour",
      "Coordinate releases across dependent teams and systems",
    ],
    qualifications: [
      "7+ years in technical programme or project management",
      "Delivered software programmes with multiple dependent teams",
      "Strong grasp of agile delivery and where it needs adapting for federal work",
      "Excellent written and verbal communication with technical and executive audiences",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "PMP, PgMP or SAFe certification",
      "Federal contract delivery experience, including CDRL and reporting obligations",
      "A technical background you can still draw on",
    ],
    skills: ["Agile delivery", "Risk management", "Jira", "Stakeholder management", "Roadmapping"],
  },
  {
    title: "Business Analyst",
    department: "Program Delivery",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "HYBRID",
    experienceLevel: "MID",
    salaryRange: "$90,000 – $115,000",
    summary:
      "Turn what a federal programme needs into requirements engineers can build from without guessing.",
    description:
      "Most delivery problems start as a requirements problem. You will work with programme staff to understand how the work actually happens, then write it down precisely enough that an engineer can build it and a tester can verify it.",
    responsibilities: [
      "Elicit requirements through interviews, workshops and observing real workflows",
      "Write user stories and acceptance criteria that are testable as written",
      "Document current and future-state process flows",
      "Support user acceptance testing and triage what comes back",
      "Maintain traceability from a stated need to the delivered feature",
      "Facilitate the conversation when the customer and the team disagree about scope",
    ],
    qualifications: [
      "3+ years as a business or systems analyst",
      "Demonstrated requirements elicitation and documentation",
      "Comfortable with process modelling notation",
      "Able to hold your own in a room with both engineers and programme leadership",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "CBAP or PMI-PBA certification",
      "Federal programme experience",
      "SQL sufficient to answer your own data questions",
    ],
    skills: ["Requirements analysis", "User stories", "BPMN", "Jira", "Confluence", "UAT"],
  },
  {
    title: "UI/UX Designer",
    department: "Design",
    location: "Remote (United States)",
    employmentType: "FULL_TIME",
    remoteType: "REMOTE",
    experienceLevel: "MID",
    salaryRange: "$95,000 – $120,000",
    summary:
      "Design federal applications that are genuinely usable by everyone who has to use them.",
    description:
      "Government users rarely get to choose their tools, which makes design quality a fairness issue rather than a preference. You will research how people actually work, design accordingly, and hold the line on accessibility.",
    responsibilities: [
      "Conduct user research and usability testing with real programme staff",
      "Produce wireframes, prototypes and high-fidelity designs in Figma",
      "Build and maintain design-system components alongside engineers",
      "Design to Section 508 and WCAG 2.1 AA from the first sketch, not as a retrofit",
      "Present and defend design decisions with evidence",
      "Work with engineers through implementation so the built result matches the intent",
    ],
    qualifications: [
      "3+ years designing digital products",
      "Strong portfolio showing process, not only final screens",
      "Expert Figma and prototyping skills",
      "Working knowledge of accessibility standards",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "US Web Design System experience",
      "Federal or other regulated product design",
      "Enough front-end knowledge to talk to engineers precisely",
    ],
    skills: ["Figma", "User research", "Prototyping", "Design systems", "WCAG", "Usability testing"],
  },
  {
    title: "Salesforce Administrator",
    department: "IT Services",
    location: KC,
    employmentType: "CONTRACT",
    remoteType: "HYBRID",
    experienceLevel: "MID",
    salaryRange: "$60 – $80 per hour",
    summary:
      "Administer and extend the Salesforce platform supporting a federal customer-service programme.",
    description:
      "A twelve-month contract engagement, with extension likely. You will own the platform day to day: configuration, automation, data quality and the steady stream of requests from a programme that depends on it.",
    responsibilities: [
      "Administer users, profiles, permission sets and sharing rules",
      "Build automation with Flow, and know when a flow is the wrong answer",
      "Create and maintain reports and dashboards for programme leadership",
      "Manage data quality, deduplication and bulk operations",
      "Coordinate sandbox-to-production deployments",
      "Train users and write documentation that reduces repeat questions",
    ],
    qualifications: [
      "3+ years administering Salesforce",
      "Salesforce Administrator certification",
      "Strong Flow and declarative automation experience",
      "Sound data management judgement",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Advanced Administrator or Platform App Builder certification",
      "Salesforce Government Cloud",
      "Basic Apex for the cases configuration cannot reach",
    ],
    skills: ["Salesforce", "Flow", "Reports & dashboards", "Data Loader", "Apex basics"],
  },
  {
    title: "Database Administrator",
    department: "IT Services",
    location: KC,
    employmentType: "FULL_TIME",
    remoteType: "ON_SITE",
    experienceLevel: "SENIOR",
    salaryRange: "$115,000 – $140,000",
    summary:
      "Keep the databases behind federal systems fast, backed up and recoverable — and prove the last part.",
    description:
      "You will own PostgreSQL and Oracle estates supporting systems that cannot be down. The role is equal parts performance work, operational discipline and the unglamorous business of verifying that a restore actually restores.",
    responsibilities: [
      "Administer PostgreSQL and Oracle in production",
      "Tune queries, indexes and configuration against real workloads",
      "Design, run and test backup and recovery procedures",
      "Plan and execute schema migrations without downtime",
      "Monitor capacity and forecast growth before it becomes urgent",
      "Implement access controls, encryption and auditing to federal requirements",
    ],
    qualifications: [
      "5+ years as a database administrator",
      "Deep PostgreSQL or Oracle expertise",
      "Demonstrated performance tuning against production workloads",
      "Backup, recovery and high-availability experience",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "AWS RDS or Aurora",
      "Database replication and failover design",
      "Federal data-protection compliance experience",
    ],
    skills: ["PostgreSQL", "Oracle", "SQL tuning", "Backup & recovery", "Replication", "Linux"],
  },
  {
    title: "Software Engineering Intern",
    department: "Software Engineering",
    location: KC,
    employmentType: "INTERNSHIP",
    remoteType: "ON_SITE",
    experienceLevel: "ENTRY",
    salaryRange: "$22 – $28 per hour",
    summary:
      "A paid summer internship on a real delivery team, with a mentor and work that ships.",
    description:
      "Twelve weeks, on a team, with a mentor assigned from day one. You will not be given a side project nobody reads — you will work on the same codebase as everyone else, at a scope that fits the time you have.",
    responsibilities: [
      "Build features and fix defects on a live product with mentor support",
      "Write tests for the code you write",
      "Take part in stand-ups, code review and sprint planning as a team member",
      "Present your work to the engineering group at the end of the internship",
      "Ask questions early rather than being stuck politely",
    ],
    qualifications: [
      "Working towards a degree in computer science, software engineering or a related field",
      "Familiar with at least one programming language",
      "Understands version control basics",
      "Available for twelve weeks over the summer",
      "US citizenship or lawful permanent residence, as required for federal work",
    ],
    preferredQualifications: [
      "Coursework or personal projects using Java, Python or JavaScript",
      "Any prior internship, hackathon or open-source contribution",
      "Interest in public-sector technology",
    ],
    skills: ["Java", "Python", "JavaScript", "Git", "Problem solving"],
  },
];

/* ------------------------------------------------------------------ runner */

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function assertLocalDatabase(url: string) {
  if (process.env.SEED_ALLOW_REMOTE === "1") return;
  const host = new URL(url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return;
  throw new Error(
    `Refusing to seed ${host}: this writes test data. Set SEED_ALLOW_REMOTE=1 if you really mean to.`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run with --env-file=.env.local.");
  assertLocalDatabase(url);

  const reset = process.argv.includes("--reset");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Every seeded job is published and attributed to an existing admin, so it
    // behaves exactly like one created through the UI.
    const [admin] = await db.select({ id: schema.admins.id })
      .from(schema.admins)
      .where(eq(schema.admins.isActive, true))
      .limit(1);
    if (!admin) {
      throw new Error("No active admin found. Run `npm run create-admin` first.");
    }

    const slugs = seedJobs.map(j => slugify(j.title));

    if (reset) {
      // Only jobs with no applications: a seeded job someone has already
      // applied to is real data now, and the foreign key would refuse anyway.
      const removable = await db.select({ id: schema.jobs.id, title: schema.jobs.title })
        .from(schema.jobs)
        .where(and(
          inArray(schema.jobs.slug, slugs),
          sql`not exists (select 1 from ${schema.applications} where ${schema.applications.jobId} = ${schema.jobs.id})`,
        ));
      if (removable.length) {
        await db.delete(schema.jobs).where(inArray(schema.jobs.id, removable.map(r => r.id)));
        console.log(`Removed ${removable.length} seeded job(s) with no applications.`);
      }
    }

    const existing = await db.select({ slug: schema.jobs.slug })
      .from(schema.jobs)
      .where(inArray(schema.jobs.slug, slugs));
    const have = new Set(existing.map(r => r.slug));

    const toInsert = seedJobs.filter(j => !have.has(slugify(j.title)));
    if (!toInsert.length) {
      console.log(`All ${seedJobs.length} seeded jobs are already present. Nothing to do.`);
      return;
    }

    await db.insert(schema.jobs).values(toInsert.map(j => ({
      title: j.title,
      slug: slugify(j.title),
      department: j.department,
      location: j.location,
      employmentType: j.employmentType,
      remoteType: j.remoteType,
      experienceLevel: j.experienceLevel,
      summary: j.summary,
      description: j.description,
      responsibilities: j.responsibilities,
      qualifications: j.qualifications,
      preferredQualifications: j.preferredQualifications,
      skills: j.skills,
      salaryRange: j.salaryRange,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      createdBy: admin.id,
    })));

    console.log(`Seeded ${toInsert.length} job(s):`);
    for (const j of toInsert) console.log(`  · ${j.title} — ${j.department}, ${j.location}`);
    if (have.size) console.log(`(${have.size} already existed and were left alone.)`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
