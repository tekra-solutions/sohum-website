/**
 * Organisations shown on the current sohumsystems.com logo wall.
 *
 * The source site presents these in one undifferentiated strip, which reads as
 * a customer list. It is not: it mixes federal customers, commercial customers,
 * technology platforms, and delivery frameworks. We keep every organisation the
 * source shows, but group them honestly so nothing implies a contract or
 * partnership the source does not support.
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
    note: "Federal and government organizations represented in our work and contract vehicles.",
    items: [
      {
        name: "U.S. Department of Agriculture",
        file: "usda.webp",
        alt: "U.S. Department of Agriculture",
      },
      { name: "Farm Service Agency", file: "fsa.webp", alt: "USDA Farm Service Agency" },
      {
        name: "U.S. General Services Administration",
        file: "gsa.webp",
        alt: "U.S. General Services Administration",
      },
      {
        name: "U.S. Department of Transportation",
        file: "usdot.webp",
        alt: "U.S. Department of Transportation",
      },
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

/** Flat list, for the homepage marquee. */
export const allLogos = logoGroups.flatMap((g) => g.items);
