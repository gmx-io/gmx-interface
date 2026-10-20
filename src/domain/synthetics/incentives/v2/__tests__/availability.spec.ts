import { describe, expect, it } from "vitest";

import { resolveIncentivesAvailability } from "../availability";
import type { IncentivesConfig } from "../types";

const config = {} as IncentivesConfig;
const error = new Error("Unavailable");

describe("resolveIncentivesAvailability", () => {
  it.each([
    { supported: false, config, error, expected: { status: "unsupported-chain" } },
    { supported: true, config, error: undefined, expected: { status: "active", config, isStale: false } },
    { supported: true, config, error, expected: { status: "active", config, isStale: true } },
    { supported: true, config: null, error: undefined, expected: { status: "inactive" } },
    { supported: true, config: undefined, error, expected: { status: "error", error } },
    { supported: true, config: undefined, error: undefined, expected: { status: "loading" } },
  ])("supported=$supported config=$config error=$error -> $expected.status", ({ expected, ...input }) => {
    expect(resolveIncentivesAvailability(input)).toEqual(expected);
  });
});
