import {
  MarketsFeesConfigsData,
  applySwapImpactWithCap,
  getMarketFeesConfig,
  getPriceImpactUsd,
} from "domain/synthetics/fees";
import { MarketsData, MarketsPoolsData, getPoolUsd } from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { DepositAmounts } from "../types";

export function getNextDepositAmountsByCollaterals(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  feesConfigs: MarketsFeesConfigsData;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
}): DepositAmounts | undefined {
  const {
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
    feesConfigs,
    marketsData,
    poolsData,
    tokensData,
  } = p;

  const feesConfig = getMarketFeesConfig(feesConfigs, marketToken.address);

  const longPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    marketToken.address,
    longToken.address,
    "midPrice"
  );

  const shortPoolUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    marketToken.address,
    shortToken.address,
    "midPrice"
  );

  if (!longToken.prices || !shortToken.prices || !marketToken.prices || !feesConfig) {
    return undefined;
  }

  let longTokenUsd =
    convertToUsd(longTokenAmount, longToken.decimals, getMidPrice(longToken.prices)) || BigNumber.from(0);
  let shortTokenUsd =
    convertToUsd(shortTokenAmount, shortToken.decimals, getMidPrice(shortToken.prices)) || BigNumber.from(0);

  const totalPriceImpactDeltaUsd = getPriceImpactUsd({
    currentLongUsd: longPoolUsd,
    currentShortUsd: shortPoolUsd,
    longDeltaUsd: longTokenUsd,
    shortDeltaUsd: shortTokenUsd,
    factorPositive: feesConfig.swapImpactFactorPositive,
    factorNegative: feesConfig.swapImpactFactorNegative,
    exponentFactor: feesConfig.swapImpactExponentFactor,
  });

  if (!totalPriceImpactDeltaUsd) {
    return undefined;
  }

  let marketTokenAmount = BigNumber.from(0);
  let marketTokenUsd = BigNumber.from(0);
  let swapFeeUsd = BigNumber.from(0);
  let swapPriceImpactDeltaUsd = BigNumber.from(0);

  if (longTokenAmount?.gt(0)) {
    const amounts = getMarketTokenAmountByCollateralDeposit({
      marketsData,
      poolsData,
      tokensData,
      feesConfigs,
      marketToken,
      tokenIn: longToken,
      tokenOut: shortToken,
      tokenInAmount: longTokenAmount,
      priceImpactDeltaUsd: totalPriceImpactDeltaUsd.mul(longTokenUsd).div(longTokenUsd.add(shortTokenUsd)),
    });

    if (!amounts) {
      return undefined;
    }

    marketTokenAmount = marketTokenAmount.add(amounts.marketTokenAmount);
    marketTokenUsd = marketTokenUsd.add(amounts.marketTokenUsd);
    swapFeeUsd = swapFeeUsd.add(amounts.swapFeeUsd);
    swapPriceImpactDeltaUsd = swapPriceImpactDeltaUsd.add(amounts.cappedPriceImpactDeltaUsd);
  }

  if (shortTokenAmount?.gt(0)) {
    const amounts = getMarketTokenAmountByCollateralDeposit({
      marketsData,
      poolsData,
      tokensData,
      feesConfigs,
      marketToken,
      tokenIn: shortToken,
      tokenOut: longToken,
      tokenInAmount: shortTokenAmount,
      priceImpactDeltaUsd: totalPriceImpactDeltaUsd.mul(shortTokenUsd).div(longTokenUsd.add(shortTokenUsd)),
    });

    if (!amounts) {
      return undefined;
    }

    marketTokenAmount = marketTokenAmount.add(amounts.marketTokenAmount)!;
    marketTokenUsd = marketTokenUsd.add(amounts.marketTokenUsd)!;
    swapFeeUsd = swapFeeUsd.add(amounts.swapFeeUsd)!;
    swapPriceImpactDeltaUsd = swapPriceImpactDeltaUsd.add(amounts.cappedPriceImpactDeltaUsd)!;
  }

  if (marketTokenAmount.lt(0)) {
    marketTokenAmount = BigNumber.from(0);
    marketTokenUsd = BigNumber.from(0);
  }

  return {
    longTokenAmount,
    longTokenUsd,
    shortTokenAmount,
    shortTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    swapFeeUsd,
    swapPriceImpactDeltaUsd,
  };
}

export function getNextDepositAmountsByMarketToken(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  feesConfigs: MarketsFeesConfigsData;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  marketTokenAmount: BigNumber;
  includeLongToken?: boolean;
  includeShortToken?: boolean;
  previousLongTokenAmount?: BigNumber;
  previousShortTokenAmount?: BigNumber;
}): DepositAmounts | undefined {
  const {
    marketToken,
    longToken,
    shortToken,
    marketTokenAmount,
    previousLongTokenAmount,
    previousShortTokenAmount,
    feesConfigs,
    marketsData,
    includeLongToken,
    includeShortToken,
    poolsData,
    tokensData,
  } = p;

  if (!longToken.prices || !shortToken.prices || !marketToken.prices) {
    return undefined;
  }

  const marketTokenUsd = convertToUsd(marketTokenAmount, marketToken.decimals, marketToken.prices.maxPrice)!;

  const previousLongTokenUsd = convertToUsd(previousLongTokenAmount, longToken.decimals, getMidPrice(longToken.prices));
  const previousShortTokenUsd = convertToUsd(
    previousShortTokenAmount,
    shortToken.decimals,
    getMidPrice(shortToken.prices)
  );

  const previousSumUsd = BigNumber.from(0)
    .add(previousLongTokenUsd || 0)
    .add(previousShortTokenUsd || 0);

  let longTokenUsd = BigNumber.from(0);
  let shortTokenUsd = BigNumber.from(0);

  if (includeLongToken && includeShortToken && previousSumUsd.gt(0)) {
    longTokenUsd = marketTokenUsd.mul(previousLongTokenUsd || 0).div(previousSumUsd);
    shortTokenUsd = marketTokenUsd.sub(longTokenUsd);
  } else if (includeLongToken) {
    longTokenUsd = marketTokenUsd;
  } else if (includeShortToken) {
    shortTokenUsd = marketTokenUsd;
  }

  let longTokenAmount = convertToTokenAmount(longTokenUsd, longToken.decimals, getMidPrice(longToken.prices));
  let shortTokenAmount = convertToTokenAmount(shortTokenUsd, shortToken.decimals, getMidPrice(shortToken.prices));

  const baseAmounts = getNextDepositAmountsByCollaterals({
    marketsData,
    poolsData,
    tokensData,
    feesConfigs,
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
  })!;

  longTokenUsd = marketTokenUsd.mul(baseAmounts.longTokenUsd!).div(baseAmounts.marketTokenUsd!);
  shortTokenUsd = marketTokenUsd.mul(baseAmounts.shortTokenUsd!).div(baseAmounts.marketTokenUsd!);
  longTokenAmount = convertToTokenAmount(longTokenUsd, longToken.decimals, getMidPrice(longToken.prices));
  shortTokenAmount = convertToTokenAmount(shortTokenUsd, shortToken.decimals, getMidPrice(shortToken.prices));

  return {
    longTokenAmount,
    longTokenUsd,
    shortTokenAmount,
    shortTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    swapFeeUsd: baseAmounts.swapFeeUsd,
    swapPriceImpactDeltaUsd: baseAmounts.swapPriceImpactDeltaUsd,
  };
}

export function getMarketTokenAmountByCollateralDeposit(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  feesConfigs: MarketsFeesConfigsData;
  marketToken: TokenData;
  tokenIn: TokenData;
  tokenOut: TokenData;
  tokenInAmount: BigNumber;
  priceImpactDeltaUsd: BigNumber;
}) {
  const feesConfig = getMarketFeesConfig(p.feesConfigs, p.marketToken.address);

  if (!feesConfig || !p.tokenIn.prices || !p.tokenOut.prices || !p.marketToken.prices) {
    return undefined;
  }

  let mintAmount = BigNumber.from(0);

  const swapFeeAmount = applyFactor(p.tokenInAmount, feesConfig.swapFeeFactor);
  const swapFeeUsd = convertToUsd(swapFeeAmount, p.tokenIn.decimals, p.tokenIn.prices.minPrice)!;

  let amountInAfterFees = p.tokenInAmount.sub(swapFeeAmount);
  let usdInAfterFees = convertToUsd(amountInAfterFees, p.tokenIn.decimals, p.tokenIn.prices.minPrice);

  let cappedPriceImpactDeltaUsd: BigNumber | undefined;

  if (p.priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(
      p.marketsData,
      p.poolsData,
      p.tokensData,
      p.marketToken.address,
      p.tokenOut.address,
      p.priceImpactDeltaUsd
    )!;

    cappedPriceImpactDeltaUsd = convertToUsd(positiveImpactAmount, p.tokenOut.decimals, p.tokenOut.prices.minPrice)!;
    mintAmount = mintAmount.add(
      convertToTokenAmount(cappedPriceImpactDeltaUsd, p.marketToken.decimals, p.marketToken.prices.minPrice)!
    );
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(
      p.marketsData,
      p.poolsData,
      p.tokensData,
      p.marketToken.address,
      p.tokenIn.address,
      p.priceImpactDeltaUsd
    )!;

    cappedPriceImpactDeltaUsd = convertToUsd(negativeImpactAmount, p.tokenIn.decimals, p.tokenIn.prices?.minPrice);
    amountInAfterFees = amountInAfterFees.sub(negativeImpactAmount.mul(-1));
    usdInAfterFees = convertToUsd(amountInAfterFees, p.tokenIn.decimals, p.tokenIn.prices?.minPrice);
  }

  if (!cappedPriceImpactDeltaUsd) {
    return undefined;
  }

  mintAmount = mintAmount.add(
    convertToTokenAmount(usdInAfterFees, p.marketToken.decimals, p.marketToken.prices.minPrice)!
  );

  const mintUsd = convertToUsd(mintAmount, p.marketToken.decimals, p.marketToken.prices.maxPrice)!;

  return {
    marketTokenAmount: mintAmount,
    marketTokenUsd: mintUsd,
    cappedPriceImpactDeltaUsd,
    swapFeeUsd,
  };
}
