/**
 * Pure logic that the recruitment flow depends on: slugs, references, rate
 * limiting and display formatting.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { slugify } from "@/lib/services/jobs";
import { formatReference } from "@/lib/services/applications";
import { rateLimit } from "@/lib/rate-limit";
import { formatFileSize, relativeTime } from "@/lib/format";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Senior Software Engineer")).toBe("senior-software-engineer");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("Cloud  &  DevOps  Engineer!")).toBe("cloud-devops-engineer");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Data Analyst--  ")).toBe("data-analyst");
  });

  it("never returns characters that are unsafe in a URL path", () => {
    expect(slugify("C++ / .NET Developer")).toMatch(/^[a-z0-9-]*$/);
  });
});

describe("application reference", () => {
  it("zero-pads to six digits", () => {
    expect(formatReference(123, 2026)).toBe("SOH-APP-2026-000123");
    expect(formatReference(1, 2026)).toBe("SOH-APP-2026-000001");
  });

  it("does not truncate a large sequence", () => {
    expect(formatReference(1234567, 2026)).toBe("SOH-APP-2026-1234567");
  });

  it("is unique per sequence value", () => {
    const refs = new Set([1, 2, 3, 4, 5].map((n) => formatReference(n, 2026)));
    expect(refs.size).toBe(5);
  });
});

describe("rate limit", () => {
  let key: string;
  beforeEach(() => {
    key = `test-${Math.random()}`;
  });

  it("allows requests up to the limit", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit({ key, limit: 3, windowMs: 60_000 });
      expect(r.ok).toBe(true);
    }
  });

  it("blocks once the limit is exceeded", async () => {
    for (let i = 0; i < 3; i++) await rateLimit({ key, limit: 3, windowMs: 60_000 });
    const blocked = await rateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    await rateLimit({ key, limit: 1, windowMs: 60_000 });
    const other = await rateLimit({ key: `${key}-other`, limit: 1, windowMs: 60_000 });
    expect(other.ok).toBe(true);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    try {
      await rateLimit({ key, limit: 1, windowMs: 1000 });
      expect((await rateLimit({ key, limit: 1, windowMs: 1000 })).ok).toBe(false);
      vi.advanceTimersByTime(1500);
      expect((await rateLimit({ key, limit: 1, windowMs: 1000 })).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("formatting", () => {
  it("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB");
  });

  it("describes recent times relatively", () => {
    expect(relativeTime(new Date(Date.now() - 30_000))).toBe("just now");
    expect(relativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe("2 hours ago");
    expect(relativeTime(new Date(Date.now() - 26 * 60 * 60 * 1000))).toBe("yesterday");
  });
});
