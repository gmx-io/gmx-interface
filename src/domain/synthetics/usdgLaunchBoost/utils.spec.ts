import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { ARBITRUM_USDG_GLV_ADDRESS } from "config/usdgPools";
import type { GlvInfo, MarketInfo } from "domain/synthetics/markets/types";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { expandDecimals } from "sdk/utils/numbers";
import type { UsdgBoostAprResponse } from "sdk/utils/usdgBoostApr/types";

import type { UsdgBoostAprResult } from "./useUsdgBoostAprRequest";
import { getUsdgLaunchBoost, getUsdgLaunchBoostApr, type UsdgLaunchBoost } from "./utils";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;

const USDG_GM_ADDRESS = "0x0000000000000000000000000000000000000001";

const USDG_GM = {
  marketTokenAddress: USDG_GM_ADDRESS,
  longTokenAddress: USDG,
  shortTokenAddress: USDG,
  isSpotOnly: false,
} as MarketInfo;
const SWAP_POOL = {
  marketTokenAddress: "0x0000000000000000000000000000000000000002",
  longTokenAddress: USDC,
  shortTokenAddress: USDG,
  isSpotOnly: true,
} as MarketInfo;
const WETH_USDC_GM = {
  marketTokenAddress: "0x0000000000000000000000000000000000000003",
  longTokenAddress: WETH,
  shortTokenAddress: USDC,
  isSpotOnly: false,
} as MarketInfo;
const USDG_GLV = {
  isGlv: true,
  glvTokenAddress: ARBITRUM_USDG_GLV_ADDRESS,
  longTokenAddress: USDG,
  shortTokenAddress: USDG,
  isSpotOnly: false,
} as unknown as GlvInfo;

const LAST_ROUND_START = 1_790_000_000;
const PAID_AT = LAST_ROUND_START + 4 * 60 * 60;
const NOW = PAID_AT + 60;

function active(glv: Partial<Extract<UsdgBoostAprResponse, { status: "active" }>["glv"]> | null): UsdgBoostAprResponse {
  return {
    status: "active",
    pools: [{ marketAddress: USDG_GM_ADDRESS, boostApr: 0.0512, lastRoundTimestamp: LAST_ROUND_START }],
    glv: glv && {
      glvAddress: ARBITRUM_USDG_GLV_ADDRESS,
      boostApr: 0.1112,
      gmRate: 0.0512,
      premium: 0.06,
      lastRoundTimestamp: LAST_ROUND_START,
      ...glv,
    },
  };
}

function percent(n: number) {
  return expandDecimals(n, 28);
}

const GM_LIVE_APR = parseUnits("5.12", 28);
const GLV_LIVE_APR = parseUnits("11.12", 28);

describe("getUsdgLaunchBoost", () => {
  it.each<{
    case: string;
    glvOrMarket: MarketInfo | GlvInfo;
    usdgBoostAprResult: UsdgBoostAprResult;
    nowSeconds?: number;
    expected: UsdgLaunchBoost | undefined;
  }>([
    {
      case: "no boost on non-USDG pools",
      glvOrMarket: WETH_USDC_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      expected: undefined,
    },
    {
      case: "no boost on the swap pool",
      glvOrMarket: SWAP_POOL,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      expected: undefined,
    },
    {
      case: "loading",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: undefined },
      expected: { isGlv: false, status: "loading" },
    },
    {
      case: "unavailable when the request fails",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: undefined, error: new Error("502") },
      expected: { isGlv: false, status: "unavailable" },
    },
    {
      case: "GM target before the first round",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: { status: "not_started" } },
      expected: { isGlv: false, status: "target", apr: percent(5) },
    },
    {
      case: "GLV target before the first round",
      glvOrMarket: USDG_GLV,
      usdgBoostAprResult: { usdgBoostAprResponse: { status: "not_started" } },
      expected: { isGlv: true, status: "target", apr: percent(8) },
    },
    {
      case: "GM live rate",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      expected: { isGlv: false, status: "live", apr: GM_LIVE_APR },
    },
    {
      case: "GLV live rate",
      glvOrMarket: USDG_GLV,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      expected: { isGlv: true, status: "live", apr: GLV_LIVE_APR },
    },
    {
      case: "last known rate while a refresh fails",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}), error: new Error("502") },
      expected: { isGlv: false, status: "live", apr: GM_LIVE_APR },
    },
    {
      case: "GLV target until its first round is paid",
      glvOrMarket: USDG_GLV,
      usdgBoostAprResult: { usdgBoostAprResponse: active(null) },
      expected: { isGlv: true, status: "target", apr: percent(8) },
    },
    {
      case: "GLV unavailable when its premium is unknown",
      glvOrMarket: USDG_GLV,
      usdgBoostAprResult: { usdgBoostAprResponse: active({ boostApr: 0.0512, premium: null }) },
      expected: { isGlv: true, status: "unavailable" },
    },
    {
      case: "GM unavailable when missing from the response",
      glvOrMarket: { ...USDG_GM, marketTokenAddress: "0x0000000000000000000000000000000000000004" },
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      expected: { isGlv: false, status: "unavailable" },
    },
    {
      case: "live 12 hours after the last payout",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      nowSeconds: PAID_AT + 12 * 60 * 60,
      expected: { isGlv: false, status: "live", apr: GM_LIVE_APR },
    },
    {
      case: "paused more than 12 hours after the last payout",
      glvOrMarket: USDG_GM,
      usdgBoostAprResult: { usdgBoostAprResponse: active({}) },
      nowSeconds: PAID_AT + 12 * 60 * 60 + 1,
      expected: { isGlv: false, status: "paused", lastRoundPaidAt: PAID_AT },
    },
    {
      case: "GLV paused on its own last payout while GM pools are live",
      glvOrMarket: USDG_GLV,
      usdgBoostAprResult: { usdgBoostAprResponse: active({ lastRoundTimestamp: LAST_ROUND_START - 4 * 60 * 60 }) },
      nowSeconds: PAID_AT + 12 * 60 * 60,
      expected: { isGlv: true, status: "paused", lastRoundPaidAt: PAID_AT - 4 * 60 * 60 },
    },
  ])("$case", ({ glvOrMarket, usdgBoostAprResult, nowSeconds = NOW, expected }) => {
    expect(getUsdgLaunchBoost({ chainId: ARBITRUM, glvOrMarket, usdgBoostAprResult, nowSeconds })).toEqual(expected);
  });
});

describe("getUsdgLaunchBoostApr", () => {
  it.each<{ case: string; launchBoost: UsdgLaunchBoost | undefined; expected: bigint }>([
    {
      case: "counts a live boost",
      launchBoost: { isGlv: false, status: "live", apr: GM_LIVE_APR },
      expected: GM_LIVE_APR,
    },
    { case: "counts a target", launchBoost: { isGlv: true, status: "target", apr: percent(8) }, expected: percent(8) },
    {
      case: "ignores a paused boost",
      launchBoost: { isGlv: false, status: "paused", lastRoundPaidAt: PAID_AT },
      expected: 0n,
    },
    { case: "ignores pools without a boost", launchBoost: undefined, expected: 0n },
  ])("$case", ({ launchBoost, expected }) => {
    expect(getUsdgLaunchBoostApr(launchBoost)).toBe(expected);
  });
});
