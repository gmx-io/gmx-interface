import values from "lodash/values";

import {
  getMintableMarketTokens,
  getSellableMarketToken,
  MarketInfo,
  MarketsInfoData,
} from "domain/synthetics/markets";
import { GlvMarket, GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";

import { bigMath } from "lib/bigmath";

import { convertToUsd } from "../tokens/utils";
import { TokenData, TokensData } from "../tokens";

export function getMaxUsdBuyableAmountInMarketWithGm(
  glvPriceUsd: bigint,
  market: GlvMarket,
  glv: GlvMarketInfo,
  gmMarketInfo: MarketInfo,
  gmMarketToken: TokenData
) {
  const mintableInGmMarket = getMintableMarketTokens(gmMarketInfo, gmMarketToken);
  const maxUsdInGmGlv = getMaxUsdBuyableAmountInMarket(glvPriceUsd, market, glv);

  return bigMath.min(mintableInGmMarket?.mintableUsd, maxUsdInGmGlv);
}

export function getMaxUsdBuyableAmountInMarket(glvPriceUsd: bigint, market: GlvMarket, glv: GlvMarketInfo) {
  const gmBalanceUsd = convertToUsd(market.gmBalance, glv.indexToken.decimals, glvPriceUsd) ?? 0n;

  return (
    bigMath.min(
      market.maxMarketTokenBalanceUsd,
      convertToUsd(market.glvMaxMarketTokenBalanceAmount, glv.indexToken.decimals, glvPriceUsd) ?? 0n
    ) - gmBalanceUsd
  );
}

export function getMintableInfoGlv(glv: GlvMarketInfo) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    return acc + getMaxUsdBuyableAmountInMarket(glvPriceUsd, market, glv);
  }, 0n);

  return {
    mintableAmount: (amountUsd / glvPriceUsd) * 10n ** BigInt(glv.indexToken.decimals),
    mintableUsd: amountUsd,
    // @todo
    longDepositCapacityUsd: 0n,
    shortDepositCapacityUsd: 0n,
    longDepositCapacityAmount: 0n,
    shortDepositCapacityAmount: 0n,
  };
}

export function getSellableInfoGlv(
  glv: GlvMarketInfo,
  marketsData: MarketsInfoData | undefined,
  tokensData: TokensData | undefined,
  gmMarketAddress?: string
) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;
  const amountUsd = values(glv.markets).reduce((acc, market) => {
    if (gmMarketAddress && gmMarketAddress !== market.address) {
      return acc;
    }

    const gmMarket = marketsData?.[market.address];

    if (!gmMarket) {
      // eslint-disable-next-line no-console
      console.warn(`Market ${market.address} presented in GLV Vault doesn't exist in the markets data`);
      return acc;
    }

    const gmMarketToken = tokensData?.[gmMarket.marketTokenAddress];

    if (!gmMarketToken) {
      return acc;
    }

    const marketSellableUsd =
      gmMarket && gmMarket.indexToken.prices ? getSellableMarketToken(gmMarket, gmMarketToken)?.totalUsd ?? 0n : 0n;
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

export function isGlv(pool?: GlvMarketInfo | MarketInfo): pool is GlvMarketInfo {
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
