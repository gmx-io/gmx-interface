import values from "lodash/values";

import {
  getMintableMarketTokens,
  getSellableMarketToken,
  GlvAndGmMarketsInfoData,
  GlvInfo,
  GlvMarket,
  GlvOrMarketInfo,
  MarketInfo,
} from "domain/synthetics/markets";

import { bigMath } from "sdk/utils/bigmath";

import { GLV_MARKETS } from "config/markets";
import { TokenData, TokensData } from "../tokens";
import { convertToTokenAmount, convertToUsd } from "../tokens/utils";

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
  glv: GlvInfo,
  gmMarketInfo: MarketInfo,
  gmMarketToken: TokenData
) {
  const mintableInGmMarket = getMintableMarketTokens(gmMarketInfo, gmMarketToken);
  const maxUsdInGmGlv = getMaxUsdBuyableAmountInMarket(market, glv, gmMarketToken);

  return bigMath.min(mintableInGmMarket?.mintableUsd, maxUsdInGmGlv);
}

export function getMaxUsdBuyableAmountInMarket(market: GlvMarket, glv: GlvInfo, gmToken: TokenData) {
  const gmBalanceUsd = convertToUsd(market.gmBalance, gmToken.decimals, gmToken.prices.maxPrice) ?? 0n;

  return (
    bigMath.min(
      market.maxMarketTokenBalanceUsd,
      convertToUsd(market.glvMaxMarketTokenBalanceAmount, gmToken.decimals, gmToken.prices.maxPrice) ?? 0n
    ) - gmBalanceUsd
  );
}

export function getMintableInfoGlv(glv: GlvInfo, marketTokensData: TokensData | undefined) {
  const glvPriceUsd = glv.glvToken.prices.maxPrice;

  const amountUsd = values(glv.markets).reduce((acc, market) => {
    const result =
      acc + (marketTokensData ? getMaxUsdBuyableAmountInMarket(market, glv, marketTokensData[market.address]) : 0n);

    return bigMath.max(result, 0n);
  }, 0n);

  return {
    mintableAmount: convertToTokenAmount(amountUsd, glv.glvToken.decimals, glvPriceUsd) ?? 0n,
    mintableUsd: amountUsd,
  };
}

export function getSellableInfoGlvInMarket(glvInfo: GlvInfo, marketToken: TokenData) {
  const market = glvInfo.markets.find((market) => market.address === marketToken.address);

  if (!market) {
    return {
      sellableUsd: 0n,
      sellableAmount: 0n,
    };
  }

  const sellableUsd = convertToUsd(market.gmBalance, marketToken.decimals, marketToken.prices.minPrice) ?? 0n;
  const sellableAmount =
    convertToTokenAmount(sellableUsd, glvInfo.glvToken.decimals, glvInfo.glvToken.prices.minPrice) ?? 0n;

  return {
    sellableUsd,
    sellableAmount,
  };
}

export function getTotalSellableInfoGlv(
  glv: GlvInfo,
  marketsData: GlvAndGmMarketsInfoData | undefined,
  tokensData: TokensData | undefined
) {
  const glvPriceUsd = glv.glvToken.prices.minPrice;
  const amountUsd = values(glv.markets).reduce((acc, market) => {
    const marketInfo = marketsData?.[market.address] as MarketInfo;

    if (!marketInfo) {
      // eslint-disable-next-line no-console
      console.warn(`Market ${market.address} presented in GLV Vault doesn't exist in the markets data`);
      return acc;
    }

    const marketToken = tokensData?.[marketInfo.marketTokenAddress];

    if (!marketToken) {
      return acc;
    }

    const marketSellableUsd =
      marketInfo && marketInfo.indexToken?.prices
        ? getSellableMarketToken(marketInfo, marketToken)?.totalUsd ?? 0n
        : 0n;
    const gmBalanceUsd = convertToUsd(market.gmBalance, marketToken.decimals, marketToken.prices.minPrice) ?? 0n;

    return acc + bigMath.min(marketSellableUsd, gmBalanceUsd);
  }, 0n);

  return {
    totalAmount: convertToTokenAmount(amountUsd, glv.glvToken.decimals, glvPriceUsd) ?? 0n,
    totalUsd: amountUsd,
  };
}

export function isGlvInfo(market?: GlvOrMarketInfo): market is GlvInfo {
  return Boolean(market && "isGlv" in market && market.isGlv);
}

export function isGlvEnabled(chainId: number) {
  return Object.keys(GLV_MARKETS[chainId] ?? {}).length > 0;
}
