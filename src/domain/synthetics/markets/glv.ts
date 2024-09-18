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

import { bigMath } from "lib/bigmath";

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

export function getSellableInfoGlv(
  glv: GlvInfo,
  marketsData: GlvAndGmMarketsInfoData | undefined,
  tokensData: TokensData | undefined,
  gmMarketAddress?: string
) {
  const glvPriceUsd = glv.glvToken.prices.minPrice;
  const amountUsd = values(glv.markets).reduce((acc, market) => {
    if (gmMarketAddress && gmMarketAddress !== market.address) {
      return acc;
    }

    const gmMarket = marketsData?.[market.address] as MarketInfo;

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
