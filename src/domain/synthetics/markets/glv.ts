import values from "lodash/values";

import { getSellableMarketToken, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { GlvMarket, GlvPoolInfo } from "domain/synthetics/tokens/useGlvPools";

import { bigMath } from "lib/bigmath";

import { convertToUsd } from "../tokens/utils";
import { TokensData } from "../tokens";

export function getMaxUsdBuyableAmountInMarket(glvPriceUsd: bigint, market: GlvMarket, glv: GlvPoolInfo) {
  const gmBalanceUsd = convertToUsd(market.gmBalance, glv.indexToken.decimals, glvPriceUsd) ?? 0n;

  return (
    bigMath.min(
      market.maxMarketTokenBalanceUsd,
      convertToUsd(market.glvMaxMarketTokenBalanceAmount, glv.indexToken.decimals, glvPriceUsd) ?? 0n
    ) - gmBalanceUsd
  );
}

export function getMintableInfoGlv(glv: GlvPoolInfo) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    return acc + getMaxUsdBuyableAmountInMarket(glvPriceUsd, market, glv);
  }, 0n);

  return {
    mintableAmount: (amountUsd / glvPriceUsd) * 10n ** BigInt(glv.indexToken.decimals),
    mintableUsd: amountUsd,
    // @todo
    longDepositCapacityUsd: undefined,
    shortDepositCapacityUsd: undefined,
    longDepositCapacityAmount: undefined,
    shortDepositCapacityAmount: undefined,
  };
}

export function getSellableInfoGlv(glv: GlvPoolInfo, marketsData?: MarketsInfoData, tokensData?: TokensData) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;
  const amountUsd = values(glv.markets).reduce((acc, market) => {
    const gmMarket = marketsData?.[market.address];

    if (!gmMarket) {
      console.warn(`Market ${market.address} presented in GLV Vault doesn't exist in the markets data`);
      return acc;
    }

    const gmMarketToken = tokensData?.[gmMarket.marketTokenAddress];

    if (!gmMarketToken) {
      return acc;
    }

    const marketSellableUsd = getSellableMarketToken(gmMarket, gmMarketToken)?.totalUsd ?? 0n;
    const gmBalanceUsd = convertToUsd(market.gmBalance, glv.indexToken.decimals, glvPriceUsd) ?? 0n;

    return acc + bigMath.min(marketSellableUsd, gmBalanceUsd);
  }, 0n);

  return {
    // @todo
    maxLongSellableUsd: 0n,
    maxShortSellableUsd: 0n,
    totalAmount: (amountUsd / glvPriceUsd) * 10n ** BigInt(glv.indexToken.decimals),
    totalUsd: amountUsd,
  };
}

export function isGlv(pool?: GlvPoolInfo | MarketInfo): pool is GlvPoolInfo {
  return Boolean(pool && "isGlv" in pool && pool.isGlv);
}

export function getGlvMarketBadgeName(name: string) {
  return name.split(" ").length > 1
    ? name
        .split(" ")
        .map((w) => w[0].toUpperCase())
        .join("")
    : name.slice(0, 3).toUpperCase();
}
