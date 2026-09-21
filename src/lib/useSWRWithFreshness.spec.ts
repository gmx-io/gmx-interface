import { describe, expect, it } from "vitest";

import { mergeFreshness } from "./useSWRWithFreshness";

describe("mergeFreshness", () => {
  it("is stale as soon as one part is stale and dates from the oldest stale part", () => {
    expect(
      mergeFreshness({ isStale: false, asOf: 10 }, { isStale: true, asOf: 30 }, { isStale: true, asOf: 20 })
    ).toEqual({
      isStale: true,
      asOf: 20,
    });
  });

  it("keeps the oldest known time while every part is fresh", () => {
    expect(mergeFreshness({ isStale: false, asOf: 10 }, undefined, { isStale: false, asOf: 5 })).toEqual({
      isStale: false,
      asOf: 5,
    });
  });

  it("reports a stale part of unknown age without inventing one", () => {
    expect(mergeFreshness({ isStale: true, asOf: undefined }, { isStale: false, asOf: 10 })).toEqual({
      isStale: true,
      asOf: undefined,
    });
  });
});
