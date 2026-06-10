import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { normalizeDateRange } from "./dates";

describe("normalizeDateRange", () => {
  beforeAll(() => {
    // UTC+12 in June, to prove the result does not depend on the local timezone.
    vi.stubEnv("TZ", "Pacific/Auckland");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes picked calendar dates to UTC day bounds regardless of local timezone", () => {
    const [from, to] = normalizeDateRange(new Date(2024, 5, 10), new Date(2024, 5, 12));

    expect(from).toBe(Date.UTC(2024, 5, 10) / 1000);
    expect(to).toBe(Date.UTC(2024, 5, 13) / 1000 - 1);
  });

  it("covers exactly one full UTC day for a single-day range", () => {
    const [from, to] = normalizeDateRange(new Date(2024, 5, 10), new Date(2024, 5, 10));

    expect(from).toBe(Date.UTC(2024, 5, 10) / 1000);
    expect(to! - from!).toBe(86400 - 1);
  });

  it("keeps undefined bounds undefined", () => {
    expect(normalizeDateRange(undefined, undefined)).toEqual([undefined, undefined]);

    const [from, to] = normalizeDateRange(new Date(2024, 5, 10), undefined);
    expect(from).toBe(Date.UTC(2024, 5, 10) / 1000);
    expect(to).toBeUndefined();
  });
});
