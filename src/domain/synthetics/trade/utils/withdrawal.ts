import { MarketsData, MarketsPoolsData, getPoolUsd } from "domain/synthetics/markets";
import { WithdrawalAmounts } from "../types";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { MarketsFeesConfigsData, getMarketFeesConfig } from "domain/synthetics/fees";
import { applyFactor } from "lib/numbers";

export function getNextWithdrawalAmountsByMarketToken(p: {
  marketsData: MarketsData;
  tokensData: TokensData;
  poolsData: MarketsPoolsData;
  feesConfigs: MarketsFeesConfigsData;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  marketTokenAmount: BigNumber;
}): WithdrawalAmounts | undefined {
  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.marketToken.address);

  const longPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.marketToken.address,
    p.longToken.address,
    "maxPrice"
  );

  const shortPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.marketToken.address,
    p.shortToken.address,
    "maxPrice"
  );

  if (
    !longPoolUsd ||
    !shortPoolUsd ||
    !feesConfig ||
    !p.marketToken.prices ||
    !p.longToken.prices ||
    !p.shortToken.prices
  ) {
    return undefined;
  }

  const totalPoolsUsd = longPoolUsd.add(shortPoolUsd);

  if (!totalPoolsUsd.gt(0)) {
    return undefined;
  }

  const marketTokenAmount = p.marketTokenAmount;
  const marketTokenUsd = convertToUsd(marketTokenAmount, p.marketToken.decimals, p.marketToken.prices.minPrice)!;

  let longTokenUsd = marketTokenUsd.mul(longPoolUsd).div(totalPoolsUsd);
  let shortTokenUsd = marketTokenUsd.mul(shortPoolUsd).div(totalPoolsUsd);

  const longSwapFeeUsd = applyFactor(longTokenUsd, feesConfig.swapFeeFactor);
  const shortSwapFeeUsd = applyFactor(shortTokenUsd, feesConfig.swapFeeFactor);
  const swapFeeUsd = longSwapFeeUsd.add(shortSwapFeeUsd);

  longTokenUsd = longTokenUsd.sub(longSwapFeeUsd);
  shortTokenUsd = shortTokenUsd.sub(shortSwapFeeUsd);

  const longTokenAmount = convertToTokenAmount(longTokenUsd, p.longToken.decimals, p.longToken.prices.maxPrice)!;
  const shortTokenAmount = convertToTokenAmount(shortTokenUsd, p.shortToken.decimals, p.shortToken.prices.maxPrice)!;

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

export function getNextWithdrawalAmountsByCollaterals(p: {
  marketsData: MarketsData;
  tokensData: TokensData;
  poolsData: MarketsPoolsData;
  feesConfigs: MarketsFeesConfigsData;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
}): WithdrawalAmounts | undefined {
  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.marketToken.address);

  const longPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.marketToken.address,
    p.longToken.address,
    "maxPrice"
  );

  const shortPoolUsd = getPoolUsd(
    p.marketsData,
    p.poolsData,
    p.tokensData,
    p.marketToken.address,
    p.shortToken.address,
    "maxPrice"
  );

  if (
    !longPoolUsd ||
    !shortPoolUsd ||
    !feesConfig ||
    !p.marketToken.prices ||
    !p.longToken.prices ||
    !p.shortToken.prices ||
    (!p.longTokenAmount && !p.shortTokenAmount)
  ) {
    return undefined;
  }

  let longTokenAmount: BigNumber;
  let shortTokenAmount: BigNumber;
  let longTokenUsd: BigNumber;
  let shortTokenUsd: BigNumber;

  if (p.longTokenAmount) {
    longTokenAmount = p.longTokenAmount;
    longTokenUsd = convertToUsd(longTokenAmount, p.longToken.decimals, p.longToken.prices.maxPrice)!;
    shortTokenUsd = longTokenUsd.mul(shortPoolUsd).div(longPoolUsd);
    shortTokenAmount = convertToTokenAmount(shortTokenUsd, p.shortToken.decimals, p.shortToken.prices.maxPrice)!;
  } else {
    shortTokenAmount = p.shortTokenAmount!;
    shortTokenUsd = convertToUsd(p.shortTokenAmount, p.shortToken.decimals, p.shortToken.prices.maxPrice)!;
    longTokenUsd = shortTokenUsd.mul(longPoolUsd).div(shortPoolUsd);
    longTokenAmount = convertToTokenAmount(longTokenUsd, p.longToken.decimals, p.longToken.prices.maxPrice)!;
  }

  let marketTokenUsd = longTokenUsd.add(shortTokenUsd);

  const swapFeeUsd = applyFactor(marketTokenUsd, feesConfig.swapFeeFactor);

  marketTokenUsd = marketTokenUsd.sub(swapFeeUsd);

  const marketTokenAmount = convertToTokenAmount(
    marketTokenUsd,
    p.marketToken.decimals,
    p.marketToken.prices.minPrice
  )!;

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
