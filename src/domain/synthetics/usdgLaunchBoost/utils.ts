import { parseUnits } from "viem";

import {
  USDG_LAUNCH_BOOST_PAUSED_AFTER_SECONDS,
  USDG_LAUNCH_BOOST_ROUND_SECONDS,
  USDG_LAUNCH_BOOST_TARGET_GLV_APR,
  USDG_LAUNCH_BOOST_TARGET_GM_APR,
  getIsUsdgPool,
} from "config/usdgPools";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getGlvOrMarketAddress } from "domain/synthetics/markets/utils";
import type { UsdgGlvBoostApr, UsdgPoolBoostApr } from "sdk/utils/usdgBoostApr/types";

import type { UsdgBoostAprResult } from "./useUsdgBoostAprRequest";

export type UsdgLaunchBoost = { isGlv: boolean } & (
  | { status: "loading" }
  | { status: "target"; apr: bigint }
  | { status: "live"; apr: bigint }
  | { status: "paused"; lastRoundPaidAt: number }
  | { status: "unavailable" }
);

export function getUsdgLaunchBoost(p: {
  chainId: number;
  glvOrMarket: GlvOrMarketInfo;
  usdgBoostAprResult: UsdgBoostAprResult;
  nowSeconds: number;
}): UsdgLaunchBoost | undefined {
  const { glvOrMarket } = p;

  if (!getIsUsdgPool(p.chainId, glvOrMarket) || glvOrMarket.isSpotOnly) {
    return undefined;
  }

  const isGlv = isGlvInfo(glvOrMarket);
  const target: UsdgLaunchBoost = {
    isGlv,
    status: "target",
    apr: isGlv ? USDG_LAUNCH_BOOST_TARGET_GLV_APR : USDG_LAUNCH_BOOST_TARGET_GM_APR,
  };
  const { usdgBoostAprResponse, error } = p.usdgBoostAprResult;

  if (!usdgBoostAprResponse) {
    return error ? { isGlv, status: "unavailable" } : { isGlv, status: "loading" };
  }

  if (usdgBoostAprResponse.status === "not_started") {
    return target;
  }

  const address = getGlvOrMarketAddress(glvOrMarket);
  let entry: UsdgPoolBoostApr | UsdgGlvBoostApr | undefined;

  if (isGlv) {
    const glv = usdgBoostAprResponse.glv;

    if (!glv) {
      return target;
    }

    if (glv.glvAddress !== address || glv.premium === null) {
      return { isGlv, status: "unavailable" };
    }

    entry = glv;
  } else {
    entry = usdgBoostAprResponse.pools.find((pool) => pool.marketAddress === address);
  }

  if (!entry) {
    return { isGlv, status: "unavailable" };
  }

  const lastRoundPaidAt = entry.lastRoundTimestamp + USDG_LAUNCH_BOOST_ROUND_SECONDS;

  if (p.nowSeconds - lastRoundPaidAt > USDG_LAUNCH_BOOST_PAUSED_AFTER_SECONDS) {
    return { isGlv, status: "paused", lastRoundPaidAt };
  }

  return { isGlv, status: "live", apr: parseUnits(String(entry.boostApr), 30) };
}

export function getIsUsdgLaunchBoostIncluded(
  launchBoost: UsdgLaunchBoost | undefined
): launchBoost is UsdgLaunchBoost & { status: "target" | "live" } {
  return launchBoost?.status === "target" || launchBoost?.status === "live";
}

export function getUsdgLaunchBoostApr(launchBoost: UsdgLaunchBoost | undefined): bigint {
  return getIsUsdgLaunchBoostIncluded(launchBoost) ? launchBoost.apr : 0n;
}
