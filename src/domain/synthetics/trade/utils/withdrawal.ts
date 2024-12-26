import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { applyFactor } from "lib/numbers";

import { WithdrawalAmounts } from "sdk/types/trade";

export function getWithdrawalAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  marketTokenAmount: bigint;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  uiFeeFactor: bigint;
  strategy: "byMarketToken" | "byLongCollateral" | "byShortCollateral" | "byCollaterals";
  forShift?: boolean;
  glvInfo?: GlvInfo;
  glvTokenAmount?: bigint;
  glvToken?: TokenData;
}) {
  const {
    marketInfo,
    marketToken,
    marketTokenAmount,
    longTokenAmount,
    shortTokenAmount,
    uiFeeFactor,
    strategy,
    glvInfo,
    glvToken,
    glvTokenAmount,
  } = p;

  const { longToken, shortToken } = marketInfo;

  const longPoolAmount = marketInfo.longPoolAmount;
  const shortPoolAmount = marketInfo.shortPoolAmount;

  const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longToken.prices.maxPrice)!;
  const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortToken.prices.maxPrice)!;

  const totalPoolUsd = longPoolUsd + shortPoolUsd;

  const values: WithdrawalAmounts = {
    marketTokenAmount: 0n,
    marketTokenUsd: 0n,
    longTokenAmount: 0n,
    longTokenUsd: 0n,
    shortTokenAmount: 0n,
    shortTokenUsd: 0n,
    glvTokenAmount: 0n,
    glvTokenUsd: 0n,
    swapFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
  };

  if (totalPoolUsd == 0n) {
    return values;
  }

  if (strategy === "byMarketToken") {
    if (glvInfo) {
      values.glvTokenAmount = glvTokenAmount!;
      values.glvTokenUsd = convertToUsd(glvTokenAmount, glvToken?.decimals, glvToken?.prices.minPrice)!;
      values.marketTokenAmount = convertToTokenAmount(
        values.glvTokenUsd,
        marketToken.decimals,
        marketToken.prices.maxPrice
      )!;
      values.marketTokenUsd = values.glvTokenUsd;
    } else {
      values.marketTokenAmount = marketTokenAmount;
      values.marketTokenUsd = marketTokenAmountToUsd(marketInfo, marketToken, marketTokenAmount);
    }

    values.longTokenUsd = bigMath.mulDiv(values.marketTokenUsd, longPoolUsd, totalPoolUsd);
    values.shortTokenUsd = bigMath.mulDiv(values.marketTokenUsd, shortPoolUsd, totalPoolUsd);

    const longSwapFeeUsd = p.forShift
      ? 0n
      : applyFactor(values.longTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);
    const shortSwapFeeUsd = p.forShift
      ? 0n
      : applyFactor(values.shortTokenUsd, p.marketInfo.swapFeeFactorForNegativeImpact);

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
    } else if (strategy === "byCollaterals") {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;

      values.uiFeeUsd = applyFactor(values.longTokenUsd + values.shortTokenUsd, uiFeeFactor);
      values.marketTokenUsd += values.uiFeeUsd;
    }

    values.marketTokenUsd = values.marketTokenUsd + values.longTokenUsd + values.shortTokenUsd;
    if (!p.forShift) {
      values.swapFeeUsd = applyFactor(
        values.longTokenUsd + values.shortTokenUsd,
        p.marketInfo.swapFeeFactorForNegativeImpact
      );
    }

    values.marketTokenUsd = values.marketTokenUsd + values.swapFeeUsd;
    values.marketTokenAmount = usdToMarketTokenAmount(marketInfo, marketToken, values.marketTokenUsd)!;

    if (glvInfo) {
      values.glvTokenUsd = convertToUsd(values.marketTokenAmount, marketToken?.decimals, marketToken?.prices.minPrice)!;
      values.glvTokenAmount = convertToTokenAmount(values.glvTokenUsd, glvToken?.decimals, glvToken?.prices.minPrice)!;
    }
  }

  return values;
}
