import { describe, expect, it } from "vitest";

import type { UsdgLaunchBoost } from "domain/synthetics/usdgLaunchBoost/utils";
import { expandDecimals } from "sdk/utils/numbers";

import { formatApyWithUsdgLaunchBoost } from "./UsdgLaunchBoostAprInfo";

function percent(n: number) {
  return expandDecimals(n, 28);
}

describe("formatApyWithUsdgLaunchBoost", () => {
  it.each<{
    case: string;
    apy: bigint | undefined;
    isApyLoading?: boolean;
    launchBoost: UsdgLaunchBoost;
    expected: string;
  }>([
    {
      case: "adds a live boost to the fee APY",
      apy: percent(6),
      launchBoost: { isGlv: false, status: "live", apr: percent(5) },
      expected: "11.00%",
    },
    {
      case: "shows the boost alone without fee history",
      apy: undefined,
      launchBoost: { isGlv: false, status: "live", apr: percent(5) },
      expected: "5.00%",
    },
    {
      case: "marks the GLV target as a minimum",
      apy: undefined,
      launchBoost: { isGlv: true, status: "target", apr: percent(8) },
      expected: "8.00%+",
    },
    {
      case: "shows the GM target as is",
      apy: undefined,
      launchBoost: { isGlv: false, status: "target", apr: percent(5) },
      expected: "5.00%",
    },
    {
      case: "leaves a paused boost out",
      apy: percent(6),
      launchBoost: { isGlv: true, status: "paused", lastRoundPaidAt: 0 },
      expected: "6.00%",
    },
    {
      case: "shows N/A when the boost is unavailable and there is no fee history",
      apy: undefined,
      launchBoost: { isGlv: true, status: "unavailable" },
      expected: "N/A",
    },
    {
      case: "waits for the fee APY",
      apy: undefined,
      isApyLoading: true,
      launchBoost: { isGlv: false, status: "live", apr: percent(5) },
      expected: "...",
    },
  ])("$case", ({ apy, isApyLoading = false, launchBoost, expected }) => {
    expect(formatApyWithUsdgLaunchBoost({ apy, isApyLoading, launchBoost })).toBe(expected);
  });
});
