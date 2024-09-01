import values from "lodash/values";

import {
  getMintableMarketTokens,
  getSellableMarketToken,
  MarketInfo,
  MarketsInfoData,
} from "domain/synthetics/markets";
import { GlvMarket, GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";

import { bigMath } from "lib/bigmath";

import { convertToTokenAmount, convertToUsd } from "../tokens/utils";
import { TokenData, TokensData } from "../tokens";

export function getMaxUsdCapUsdInGmGlvMarket(market: GlvMarket, gmToken?: TokenData) {
  if (!gmToken) {
    return 0n;
  }

  return bigMath.min(
    market.maxMarketTokenBalanceUsd,
    convertToUsd(market.glvMaxMarketTokenBalanceAmount, gmToken.decimals, gmToken.prices.minPrice) ?? 0n
  );
}

export function getMaxUsdBuyableAmountInMarketWithGm(
  market: GlvMarket,
  glv: GlvMarketInfo,
  gmMarketInfo: MarketInfo,
  gmMarketToken: TokenData
) {
  const mintableInGmMarket = getMintableMarketTokens(gmMarketInfo, gmMarketToken);
  const maxUsdInGmGlv = getMaxUsdBuyableAmountInMarket(market, glv, gmMarketToken);

  return bigMath.min(mintableInGmMarket?.mintableUsd, maxUsdInGmGlv);
}

export function getMaxUsdBuyableAmountInMarket(market: GlvMarket, glv: GlvMarketInfo, gmToken: TokenData) {
  const gmBalanceUsd = convertToUsd(market.gmBalance, gmToken.decimals, gmToken.prices.maxPrice) ?? 0n;

  return (
    bigMath.min(
      market.maxMarketTokenBalanceUsd,
      convertToUsd(market.glvMaxMarketTokenBalanceAmount, gmToken.decimals, gmToken.prices.maxPrice) ?? 0n
    ) - gmBalanceUsd
  );
}

export function getMintableInfoGlv(glv: GlvMarketInfo, marketTokensData: TokensData | undefined) {
  const glvPriceUsd = glv.indexToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    return (
      acc + (marketTokensData ? getMaxUsdBuyableAmountInMarket(market, glv, marketTokensData[market.address]) : 0n)
    );
  }, 0n);

  return {
    mintableAmount: convertToTokenAmount(amountUsd, glv.indexToken.decimals, glvPriceUsd) ?? 0n,
    mintableUsd: amountUsd,
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
  const glvPriceUsd = glv.indexToken.prices.minPrice;
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
      gmMarket && gmMarket.indexToken?.prices ? getSellableMarketToken(gmMarket, gmMarketToken)?.totalUsd ?? 0n : 0n;
    const gmBalanceUsd = convertToUsd(market.gmBalance, gmMarketToken.decimals, gmMarketToken.prices.minPrice) ?? 0n;

    return acc + bigMath.min(marketSellableUsd, gmBalanceUsd);
  }, 0n);

  return {
    maxLongSellableUsd: 0n,
    maxShortSellableUsd: 0n,
    totalAmount: convertToTokenAmount(amountUsd, glv.indexToken.decimals, glvPriceUsd) ?? 0n,
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
