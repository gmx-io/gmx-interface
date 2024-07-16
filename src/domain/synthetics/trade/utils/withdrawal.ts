import { MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { applyFactor } from "lib/numbers";
import { WitdhrawalAmounts } from "../types";
import { bigMath } from "lib/bigmath";

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

  const totalPoolUsd = longPoolUsd + shortPoolUsd;

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

    values.longTokenUsd = bigMath.mulDiv(values.marketTokenUsd, longPoolUsd, totalPoolUsd);
    values.shortTokenUsd = bigMath.mulDiv(values.marketTokenUsd, shortPoolUsd, totalPoolUsd);

    const longSwapFeeUsd = applyFactor(values.longTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const shortSwapFeeUsd = applyFactor(values.shortTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const longUiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    const shortUiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);

    values.uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    values.swapFeeUsd = longSwapFeeUsd + shortSwapFeeUsd;

    values.longTokenUsd = values.longTokenUsd - longSwapFeeUsd - longUiFeeUsd;
    values.shortTokenUsd = values.shortTokenUsd - shortSwapFeeUsd - shortUiFeeUsd;

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longToken.prices.maxPrice)!;
    values.shortTokenAmount = convertToTokenAmount(
      values.shortTokenUsd,
      shortToken.decimals,
      shortToken.prices.maxPrice
    )!;
  } else {
    if (strategy === "byLongCollateral" && longPoolUsd > 0) {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
      values.shortTokenUsd = bigMath.mulDiv(values.longTokenUsd, shortPoolUsd, longPoolUsd);
      values.shortTokenAmount = convertToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    } else if (strategy === "byShortCollateral" && shortPoolUsd > 0) {
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
      values.longTokenUsd = bigMath.mulDiv(values.shortTokenUsd, longPoolUsd, shortPoolUsd);
      values.longTokenAmount = convertToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
    }

    values.marketTokenUsd = values.longTokenUsd + values.shortTokenUsd;
    values.swapFeeUsd = applyFactor(values.marketTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);

    values.marketTokenUsd = values.marketTokenUsd + values.swapFeeUsd;
    values.marketTokenAmount = usdToMarketTokenAmount(marketInfo, marketToken, values.marketTokenUsd)!;
  }

  return values;
}
