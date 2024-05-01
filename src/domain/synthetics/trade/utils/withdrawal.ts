import { MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { applyFactor } from "lib/numbers";
import { WitdhrawalAmounts } from "../types";

export function getWithdrawalAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  marketTokenAmount: bigint;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  uiFeeFactor: bigint;
  strategy: "byMarketToken" | "byLongCollateral" | "byShortCollateral";
}) {
  const { marketInfo, marketToken, marketTokenAmount, longTokenAmount, shortTokenAmount, uiFeeFactor, strategy } = p;

  const { longToken, shortToken } = marketInfo;

  const longPoolAmount = marketInfo.longPoolAmount;
  const shortPoolAmount = marketInfo.shortPoolAmount;

  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longToken.prices.maxPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortToken.prices.maxPrice)!;

  const totalPoolUsd = longPoolUsd.add(shortPoolUsd);

  const values: WitdhrawalAmounts = {
    marketTokenAmount: 0n,
    marketTokenUsd: 0n,
    longTokenAmount: 0n,
    longTokenUsd: 0n,
    shortTokenAmount: 0n,
    shortTokenUsd: 0n,
    swapFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
  };

  if (totalPoolUsd == 0n) {
    return values;
  }

  if (strategy === "byMarketToken") {
    values.marketTokenAmount = marketTokenAmount;
    values.marketTokenUsd = marketTokenAmountToUsd(marketInfo, marketToken, marketTokenAmount)!;

    values.longTokenUsd = values.marketTokenUsd.mul(longPoolUsd).div(totalPoolUsd);
    values.shortTokenUsd = values.marketTokenUsd.mul(shortPoolUsd).div(totalPoolUsd);

    const longSwapFeeUsd = applyFactor(values.longTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const shortSwapFeeUsd = applyFactor(values.shortTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const longUiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    const shortUiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);

    values.uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    values.swapFeeUsd = longSwapFeeUsd.add(shortSwapFeeUsd);

    values.longTokenUsd = values.longTokenUsd.sub(longSwapFeeUsd).sub(longUiFeeUsd);
    values.shortTokenUsd = values.shortTokenUsd.sub(shortSwapFeeUsd).sub(shortUiFeeUsd);

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longToken.prices.maxPrice)!;
    values.shortTokenAmount = convertToTokenAmount(
      values.shortTokenUsd,
      shortToken.decimals,
      shortToken.prices.maxPrice
    )!;
  } else {
    if (strategy === "byLongCollateral" && longPoolUsd.gt(0)) {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
      values.shortTokenUsd = values.longTokenUsd.mul(shortPoolUsd).div(longPoolUsd);
      values.shortTokenAmount = convertToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    } else if (strategy === "byShortCollateral" && shortPoolUsd.gt(0)) {
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
      values.longTokenUsd = values.shortTokenUsd.mul(longPoolUsd).div(shortPoolUsd);
      values.longTokenAmount = convertToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
    }

    values.marketTokenUsd = values.longTokenUsd.add(values.shortTokenUsd);
    values.swapFeeUsd = applyFactor(values.marketTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);

    values.marketTokenUsd = values.marketTokenUsd.add(values.swapFeeUsd);
    values.marketTokenAmount = usdToMarketTokenAmount(marketInfo, marketToken, values.marketTokenUsd)!;
  }

  return values;
}
