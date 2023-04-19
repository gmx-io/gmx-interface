import {
  VirtualInventoryForSwapsData,
  applySwapImpactWithCap,
  getNextPoolAmountsParams,
  getPriceImpactUsd,
} from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { DepositAmounts } from "../types";

export function getNextDepositAmountsByCollaterals(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  virtualInventoryForSwaps: VirtualInventoryForSwapsData;
}): DepositAmounts | undefined {
  const { marketToken, longTokenAmount, shortTokenAmount, marketInfo, virtualInventoryForSwaps } = p;
  const { longToken, shortToken } = marketInfo;

  if (!longToken.prices || !shortToken.prices || !marketToken.prices) {
    return undefined;
  }

  let longTokenUsd =
    convertToUsd(longTokenAmount, longToken.decimals, getMidPrice(longToken.prices)) || BigNumber.from(0);
  let shortTokenUsd =
    convertToUsd(shortTokenAmount, shortToken.decimals, getMidPrice(shortToken.prices)) || BigNumber.from(0);

  const nextPoolAmountParams = getNextPoolAmountsParams({
    marketInfo,
    longToken,
    shortToken,
    longPoolAmount: marketInfo.longPoolAmount,
    shortPoolAmount: marketInfo.shortPoolAmount,
    longDeltaUsd: longTokenUsd,
    shortDeltaUsd: shortTokenUsd,
  });

  let totalPriceImpactDeltaUsd = getPriceImpactUsd({
    currentLongUsd: nextPoolAmountParams.longPoolUsd,
    currentShortUsd: nextPoolAmountParams.shortPoolUsd,
    nextLongUsd: nextPoolAmountParams.nextLongPoolUsd,
    nextShortUsd: nextPoolAmountParams.nextShortPoolUsd,
    factorPositive: marketInfo.swapImpactFactorPositive,
    factorNegative: marketInfo.swapImpactFactorNegative,
    exponentFactor: marketInfo.swapImpactExponentFactor,
  });

  if (!totalPriceImpactDeltaUsd) {
    return undefined;
  }

  const virtualInventoryLong = virtualInventoryForSwaps?.[marketInfo.marketTokenAddress]?.[marketInfo.longTokenAddress];
  const virtualInventoryShort =
    virtualInventoryForSwaps?.[marketInfo.marketTokenAddress]?.[marketInfo.shortTokenAddress];

  if (virtualInventoryLong && virtualInventoryShort) {
    const virtualInventoryParams = getNextPoolAmountsParams({
      marketInfo,
      longToken,
      shortToken,
      longPoolAmount: virtualInventoryLong,
      shortPoolAmount: virtualInventoryShort,
      longDeltaUsd: longTokenUsd,
      shortDeltaUsd: shortTokenUsd,
    });

    const virtualInventoryPriceImpactDeltaUsd = getPriceImpactUsd({
      currentLongUsd: virtualInventoryParams.longPoolUsd,
      currentShortUsd: virtualInventoryParams.shortPoolUsd,
      nextLongUsd: virtualInventoryParams.nextLongPoolUsd,
      nextShortUsd: virtualInventoryParams.nextShortPoolUsd,
      factorPositive: marketInfo.swapImpactFactorPositive,
      factorNegative: marketInfo.swapImpactFactorNegative,
      exponentFactor: marketInfo.swapImpactExponentFactor,
    });

    if (virtualInventoryPriceImpactDeltaUsd && virtualInventoryPriceImpactDeltaUsd.lt(totalPriceImpactDeltaUsd)) {
      totalPriceImpactDeltaUsd = virtualInventoryPriceImpactDeltaUsd;
    }
  }

  if (!totalPriceImpactDeltaUsd) {
    return undefined;
  }

  let marketTokenAmount = BigNumber.from(0);
  let marketTokenUsd = BigNumber.from(0);
  let swapFeeUsd = BigNumber.from(0);
  let swapPriceImpactDeltaUsd = BigNumber.from(0);

  if (longTokenAmount?.gt(0)) {
    const amounts = getMarketTokenAmountByCollateralDeposit({
      marketInfo,
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
      marketInfo,
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
  marketInfo: MarketInfo;
  virtualInventoryForSwaps: VirtualInventoryForSwapsData;
  marketToken: TokenData;
  marketTokenAmount: BigNumber;
  includeLongToken?: boolean;
  includeShortToken?: boolean;
  previousLongTokenAmount?: BigNumber;
  previousShortTokenAmount?: BigNumber;
}): DepositAmounts | undefined {
  const {
    marketInfo,
    marketToken,
    marketTokenAmount,
    previousLongTokenAmount,
    previousShortTokenAmount,
    includeLongToken,
    includeShortToken,
    virtualInventoryForSwaps,
  } = p;

  const { longToken, shortToken } = marketInfo;

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
    marketInfo,
    marketToken,
    longTokenAmount,
    shortTokenAmount,
    virtualInventoryForSwaps,
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
  marketInfo: MarketInfo;
  marketToken: TokenData;
  tokenIn: TokenData;
  tokenOut: TokenData;
  tokenInAmount: BigNumber;
  priceImpactDeltaUsd: BigNumber;
}) {
  const { marketInfo } = p;

  if (!p.tokenIn.prices || !p.tokenOut.prices || !p.marketToken.prices) {
    return undefined;
  }

  let mintAmount = BigNumber.from(0);

  const swapFeeAmount = applyFactor(p.tokenInAmount, marketInfo.swapFeeFactor);
  const swapFeeUsd = convertToUsd(swapFeeAmount, p.tokenIn.decimals, p.tokenIn.prices.minPrice)!;

  let amountInAfterFees = p.tokenInAmount.sub(swapFeeAmount);
  let usdInAfterFees = convertToUsd(amountInAfterFees, p.tokenIn.decimals, p.tokenIn.prices.minPrice);

  let cappedPriceImpactDeltaUsd: BigNumber | undefined;

  if (p.priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(p.marketInfo, p.tokenOut.address, p.priceImpactDeltaUsd)!;

    cappedPriceImpactDeltaUsd = convertToUsd(positiveImpactAmount, p.tokenOut.decimals, p.tokenOut.prices.minPrice)!;
    mintAmount = mintAmount.add(
      convertToTokenAmount(cappedPriceImpactDeltaUsd, p.marketToken.decimals, p.marketToken.prices.minPrice)!
    );
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(p.marketInfo, p.tokenIn.address, p.priceImpactDeltaUsd)!;

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
