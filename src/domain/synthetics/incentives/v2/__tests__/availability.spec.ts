import { describe, expect, it } from "vitest";

import { resolveIncentivesAvailability } from "../availability";
import type { IncentivesConfig } from "../types";

const config = {} as IncentivesConfig;

describe("resolveIncentivesAvailability", () => {
  it("returns unsupported without consulting data", () => {
    expect(resolveIncentivesAvailability({ supported: false, config, error: new Error("Ignored") })).toEqual({
      status: "unsupported-chain",
    });
  });

  it("returns active and marks cached config stale after a revalidation error", () => {
    expect(resolveIncentivesAvailability({ supported: true, config, error: undefined })).toEqual({
      status: "active",
      config,
      isStale: false,
    });
    expect(resolveIncentivesAvailability({ supported: true, config, error: new Error("Unavailable") })).toEqual({
      status: "active",
      config,
      isStale: true,
    });
  });

  it("distinguishes inactive, error, and loading", () => {
    expect(resolveIncentivesAvailability({ supported: true, config: null, error: undefined })).toEqual({
      status: "inactive",
    });
    expect(
      resolveIncentivesAvailability({ supported: true, config: undefined, error: new Error("Unavailable") })
    ).toEqual({ status: "error", error: new Error("Unavailable") });
    expect(resolveIncentivesAvailability({ supported: true, config: undefined, error: undefined })).toEqual({
      status: "loading",
    });
  });
});
