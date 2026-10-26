/**
 * Company facts for page components.
 *
 * This module used to hold its own copy of the facts, captured from the old
 * website in 2026-09, and it drifted: it still claimed SBA 8(a) through 2027
 * and a NASA SEWP VI position. It is now a thin adapter over the verified
 * record in src/content/company.ts, so every page reads the same facts and
 * date-driven statuses (vehicles, credentials) update on their own.
 */
import {
  contact as verifiedContact,
  credentials as verifiedCredentials,
  formatDate,
  getVisibleCredentials,
  naics as verifiedNaics,
  procurement,
  site as verifiedSite,
  today,
  vehicleStatus,
  vehicles as verifiedVehicles,
  type Naics,
} from "@/content/company";

export type { Naics };

export const site = verifiedSite;
export const contact = verifiedContact;
export const naics = verifiedNaics;

export const identifiers = [
  { label: "UEI", value: procurement.uei },
  { label: "CAGE", value: procurement.cage },
  { label: "Business size", value: procurement.businessSize },
  { label: "Primary NAICS", value: procurement.primaryNaics },
] as const;

/** Credentials still within their validity period (expired ones are hidden). */
export const siteCredentials = () => getVisibleCredentials(today());
export const allCredentials = verifiedCredentials;

export type Vehicle = {
  slug: string;
  name: string;
  badge?: string;
  full?: string;
  holder: string;
  number?: string;
  status: "active" | "expired";
  statusLabel: string;
  pop?: string;
  detail: { label: string; value: string }[];
  summary: string;
  useIt: string;
};

/** Evaluated per render, so statuses follow the calendar on a long-running server. */
export const siteVehicles = (): Vehicle[] => verifiedVehicles.map((v) => {
  const status = vehicleStatus(v, today());
  return {
    slug: v.slug,
    name: v.name,
    badge: v.badge,
    full: v.full,
    holder: v.holder,
    number: v.number,
    status: status === "Active" ? "active" : "expired",
    statusLabel: status,
    pop: `${formatDate(v.orderingStartsOn)} – ${formatDate(v.orderingEndsOn)}`,
    detail: [
      { label: "Contract number", value: v.number },
      { label: "Ordering period", value: `${formatDate(v.orderingStartsOn)} – ${formatDate(v.orderingEndsOn)}` },
      ...(v.taskOrdersEndOn ? [{ label: "Task orders may run through", value: formatDate(v.taskOrdersEndOn) }] : []),
      ...v.detail,
      { label: "Order types", value: v.orderTypes },
    ],
    summary: v.summary,
    useIt: v.useIt,
  };
});

export const siteActiveVehicles = () => siteVehicles().filter((v) => v.status === "active");
