import { Market, MarketTokenData, MarketsData, MarketsPoolsData, getPoolUsd } from "domain/synthetics/markets";
import { WithdrawalAmounts } from "../types";
import { TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { MarketsFeesConfigsData, getMarketFeesConfig } from "domain/synthetics/fees";
import { applyFactor } from "lib/numbers";

export function getWithdawalAmounts(p: {
  marketsData: MarketsData;
  tokensData: TokensData;
  poolsData: MarketsPoolsData;
  feesConfigs: MarketsFeesConfigsData;
  market?: Market;
  marketToken?: MarketTokenData;
  marketTokenAmount?: BigNumber;
}): WithdrawalAmounts | undefined {
  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.market?.marketTokenAddress);

  const longPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.market?.marketTokenAddress,
    p.market?.longTokenAddress,
    "midPrice"
  );

  const shortPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.market?.marketTokenAddress,
    p.market?.shortTokenAddress,
    "midPrice"
  );

  const totalPoolsUsd = longPoolUsd?.add(shortPoolUsd!);

  const marketTokenAmount = p.marketTokenAmount;
  const marketTokenUsd = convertToUsd(marketTokenAmount, p.marketToken?.decimals, p.marketToken?.prices?.minPrice!);

  const longToken = getTokenData(p.tokensData, p.market?.longTokenAddress);
  const shortToken = getTokenData(p.tokensData, p.market?.shortTokenAddress);

  if (
    !longPoolUsd ||
    !shortPoolUsd ||
    !marketTokenUsd ||
    !feesConfig ||
    !totalPoolsUsd ||
    !longToken?.prices ||
    !shortToken?.prices ||
    !marketTokenUsd ||
    !marketTokenAmount
  ) {
    return undefined;
  }

  let longTokenUsd = marketTokenUsd.mul(longPoolUsd).div(totalPoolsUsd);
  let shortTokenUsd = marketTokenUsd.mul(shortPoolUsd).div(totalPoolsUsd);

  const longSwapFee = applyFactor(longTokenUsd, feesConfig.swapFeeFactor);
  const shortSwapFee = applyFactor(shortTokenUsd, feesConfig.swapFeeFactor);

  const swapFeeUsd = longSwapFee.add(shortSwapFee);

  longTokenUsd = longTokenUsd.sub(longSwapFee);
  shortTokenUsd = shortTokenUsd.sub(shortSwapFee);

  const longTokenAmount = convertToTokenAmount(longTokenUsd, longToken.decimals, longToken.prices.maxPrice)!;
  const shortTokenAmount = convertToTokenAmount(shortTokenUsd, shortToken.decimals, shortToken.prices.maxPrice)!;

  return {
    marketTokenAmount,
    marketTokenUsd,
    longTokenAmount,
    longTokenUsd,
    shortTokenAmount,
    shortTokenUsd,
    swapFeeUsd,
  };
}
