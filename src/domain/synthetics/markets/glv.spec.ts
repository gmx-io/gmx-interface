import values from "lodash/values";

import { MarketInfo } from "domain/synthetics/markets";
import { GlvPoolInfo } from "domain/synthetics/tokens/useGlvPools";

import { bigMath } from "lib/bigmath";

import { convertToUsd } from "../tokens/utils";

export function getMintableInfoGlv(glv: GlvPoolInfo) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    debugger; // eslint-disable-line
    return (
      acc +
      bigMath.min(
        market.maxMarketTokenBalanceUsd,
        convertToUsd(market.glvMaxMarketTokenBalanceAmount, glv.indexToken.decimals, glvPriceUsd) ?? 0n
      )
    );
  }, 0n);

  return {
    mintableAmount: (amountUsd / glvPriceUsd) * 10n ** BigInt(glv.indexToken.decimals),
    mintableUsd: amountUsd,
  };
}

export function isGlv(pool: GlvPoolInfo | MarketInfo): pool is GlvPoolInfo {
  return (pool as GlvPoolInfo).isGlv === true;
}

export function getGlvMarketBadgeName(name: string) {
  return name.split(" ").length > 1
    ? name
        .split(" ")
        .map((w) => w[0].toUpperCase())
        .join("")
    : name.slice(0, 3).toUpperCase();
}
