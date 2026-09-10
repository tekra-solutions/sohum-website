import type { MetadataRoute } from "next";
import { capabilities } from "@/lib/capabilities";
import { locations } from "@/lib/locations";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/capabilities`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/federal`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/contract-vehicles`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${site.url}/careers`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/locations`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/accessibility`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const capabilityPages: MetadataRoute.Sitemap = capabilities.map((c) => ({
    url: `${site.url}/capabilities/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const locationPages: MetadataRoute.Sitemap = locations.map((l) => ({
    url: `${site.url}/locations/${l.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...core, ...capabilityPages, ...locationPages].map((entry) => ({
    ...entry,
    lastModified: now,
  }));
}
