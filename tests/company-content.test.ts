import { describe, expect, it } from "vitest";
import {
  credentialStatus,
  credentials,
  getActiveVehicles,
  getVisibleCredentials,
  getVisibleVehicles,
  is8aActive,
  orderingClosesIn,
  procurement,
  sbaCountdown,
  sba8aLabel,
  socioeconomic,
  today,
  vehicles,
  vehicleStatus,
  type Vehicle,
} from "@/content/company";
import {
  FALLBACK_RADIUS,
  features,
  getFeature,
  groupSites,
  projectFallback,
  visibleFeatures,
} from "@/content/globe";
import * as company from "@/content/company";

const cio = vehicles.find((v) => v.slug === "cio-sp3")!;
const gsa = vehicles.find((v) => v.slug === "gsa-mas")!;
const seaport = vehicles.find((v) => v.slug === "seaport-nxg")!;

describe("contract vehicle status", () => {
  it("keeps CIO-SP3 ordering open through the full last day", () => {
    expect(vehicleStatus(cio, "2026-10-29")).toBe("Active");
    expect(vehicleStatus(cio, "2026-10-30")).toBe("Ordering closed – existing task orders continue");
  });

  it("keeps CIO-SP3 task orders visible for five years, then hides the vehicle", () => {
    expect(vehicleStatus(cio, "2031-10-29")).toBe("Ordering closed – existing task orders continue");
    expect(getVisibleVehicles("2031-10-30").some((v) => v.slug === cio.slug)).toBe(false);
  });

  it("expires vehicles without a task-order tail the day after ordering ends", () => {
    expect(vehicleStatus(gsa, "2029-07-17")).toBe("Active");
    expect(vehicleStatus(gsa, "2029-07-18")).toBe("Expired");
    expect(vehicleStatus(seaport, "2029-01-02")).toBe("Expired");
  });

  it("shows a future opening date instead of Active", () => {
    const upcoming: Vehicle = { ...gsa, orderingStartsOn: "2026-11-01" };
    expect(vehicleStatus(upcoming, "2026-10-31")).toBe("Ordering opens Nov 1, 2026");
    expect(vehicleStatus(upcoming, "2026-11-01")).toBe("Active");
  });

  it("warns only inside the final 90 days of ordering", () => {
    expect(orderingClosesIn(cio, "2026-10-05")).toBe(24);
    expect(orderingClosesIn(cio, "2026-07-01")).toBeNull();
    expect(orderingClosesIn(cio, "2026-10-30")).toBeNull();
  });

  it("sorts open vehicles ahead of closed ones", () => {
    expect(getVisibleVehicles("2026-11-15").at(-1)?.slug).toBe("cio-sp3");
    expect(getActiveVehicles("2026-11-15").map((v) => v.slug)).toEqual(["gsa-mas", "seaport-nxg"]);
  });
});

describe("dates", () => {
  it("rolls over at midnight in the buyer's Eastern time zone, including DST", () => {
    expect(today(new Date("2026-10-30T03:59:59Z"))).toBe("2026-10-29");
    expect(today(new Date("2026-10-30T04:00:00Z"))).toBe("2026-10-30");
    expect(today(new Date("2026-11-12T04:59:59Z"))).toBe("2026-11-11");
  });
});

describe("SBA 8(a)", () => {
  it("follows SBA's recorded term exactly", () => {
    expect(is8aActive("2026-02-27")).toBe(true);
    expect(is8aActive("2026-02-28")).toBe(false);
  });

  it("drops every 8(a) claim once the term has ended", () => {
    expect(sbaCountdown("2026-10-05")).toBeNull();
    expect(sba8aLabel("2026-10-05")).toBeNull();
    expect(socioeconomic("2026-10-05").some((s) => s.includes("8(a)"))).toBe(false);
    expect(getVisibleCredentials("2026-10-05").some((c) => c.short === "SBA 8(a)")).toBe(false);
  });

  it("counts down in months, then days, while the term is active", () => {
    expect(sbaCountdown("2025-10-05")).toBe("4 months remaining");
    expect(sbaCountdown("2026-02-20")).toBe("7 days remaining");
    expect(sbaCountdown("2026-02-27")).toBe("Final day of program term");
  });
});

describe("credentials", () => {
  it("never claims a validity date it does not have", () => {
    const iso = credentials.find((c) => c.short === "ISO 9001")!;
    expect(credentialStatus(iso, "2026-10-05")).toBeNull();
    expect(credentialStatus({ ...iso, validThrough: "2026-10-05" }, "2026-10-05")).toBe("Valid");
    expect(credentialStatus({ ...iso, validThrough: "2026-10-05" }, "2026-10-06")).toBe("Expired");
  });
});

describe("content hygiene", () => {
  it("publishes no placeholder text and no DUNS", () => {
    const text = JSON.stringify(company, (_k, v) => (typeof v === "function" ? undefined : v));
    expect(text).not.toMatch(/TODO|\[\[|DUNS|053861658/);
    expect(procurement.uei).toMatch(/^[A-Z0-9]{12}$/);
  });
});

describe("mission map", () => {
  it("uses unique feature ids so deep links and records cannot disagree", () => {
    expect(new Set(features.map((f) => f.id)).size).toBe(features.length);
  });

  it("honors layer toggles and the 8(a) term", () => {
    expect(visibleFeatures([], "2026-10-05")).toEqual([]);
    expect(visibleFeatures(["delivery"], "2026-10-05").map((f) => f.id)).toEqual(["hq", "dfad", "navy"]);
    expect(visibleFeatures(["vehicles"], "2026-10-05").some((f) => f.id === "8a")).toBe(false);
    expect(visibleFeatures(["vehicles"], "2026-01-05").some((f) => f.id === "8a")).toBe(true);
    expect(visibleFeatures(["vehicles"], "2031-10-30").some((f) => f.id === "cio-sp3")).toBe(false);
  });

  it("groups features that would overlap into one site", () => {
    const sites = groupSites(visibleFeatures(["delivery", "vehicles", "hub"], "2026-10-05"));
    const kc = sites.find((s) => s.id === "hq")!;
    expect(kc.features.map((f) => f.id)).toEqual(["hq", "dfad"]);
    const dc = sites.find((s) => s.features.some((f) => f.id === "ncr"))!;
    expect(dc.features.map((f) => f.id).sort()).toEqual(["cio-sp3", "gsa-mas", "ncr", "seaport-nxg"]);
    expect(sites.find((s) => s.id === "navy")!.features).toHaveLength(1);
  });

  it("projects the default view centre to the middle of the fallback map", () => {
    const centre = projectFallback(39, -96);
    expect(centre.x).toBeCloseTo(50);
    expect(centre.y).toBeCloseTo(50);
    expect(FALLBACK_RADIUS).toBeCloseTo(37.9, 1);
    expect(projectFallback(39, 84).visible).toBe(false);
  });

  it("resolves deep links", () => {
    expect(getFeature("cio-sp3")?.title).toBe("CIO-SP3 Small Business");
    expect(getFeature("nope")).toBeUndefined();
    expect(getFeature(null)).toBeUndefined();
  });
});
