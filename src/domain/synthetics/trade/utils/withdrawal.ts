import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { ERC20Address } from "domain/tokens";
import { applyFactor } from "lib/numbers";
import { FindSwapPath, WithdrawalAmounts } from "sdk/utils/trade/types";
import { bigMath } from "sdk/utils/bigmath";

export function getWithdrawalAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  marketTokenAmount: bigint;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  wrappedReceiveTokenAddress?: ERC20Address;
  uiFeeFactor: bigint;
  strategy: "byMarketToken" | "byLongCollateral" | "byShortCollateral" | "byCollaterals";
  forShift?: boolean;
  glvInfo?: GlvInfo;
  glvTokenAmount?: bigint;
  glvToken?: TokenData;
  findSwapPath?: FindSwapPath;
  isSameCollaterals?: boolean;
}): WithdrawalAmounts {
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
    findSwapPath,
    wrappedReceiveTokenAddress,
    isSameCollaterals,
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
    longTokenBeforeSwapAmount: 0n,
    longTokenUsd: 0n,
    shortTokenAmount: 0n,
    shortTokenBeforeSwapAmount: 0n,
    shortTokenUsd: 0n,
    glvTokenAmount: 0n,
    glvTokenUsd: 0n,
    swapFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
    longTokenSwapPathStats: undefined,
    shortTokenSwapPathStats: undefined,
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

    // TODO MLTCH: add atomic swap fees
    const longSwapFeeUsd = p.forShift
      ? 0n
      : applyFactor(values.longTokenUsd, p.marketInfo.swapFeeFactorForBalanceWasNotImproved);
    const shortSwapFeeUsd = p.forShift
      ? 0n
      : applyFactor(values.shortTokenUsd, p.marketInfo.swapFeeFactorForBalanceWasNotImproved);

    const longUiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    const shortUiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);

    values.uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    values.swapFeeUsd = longSwapFeeUsd + shortSwapFeeUsd;

    values.longTokenUsd = values.longTokenUsd - longSwapFeeUsd - longUiFeeUsd;
    values.shortTokenUsd = values.shortTokenUsd - shortSwapFeeUsd - shortUiFeeUsd;

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longToken.prices.maxPrice)!;
    values.longTokenBeforeSwapAmount = values.longTokenAmount;
    values.shortTokenAmount = convertToTokenAmount(
      values.shortTokenUsd,
      shortToken.decimals,
      shortToken.prices.maxPrice
    )!;
    values.shortTokenBeforeSwapAmount = values.shortTokenAmount;

    if (wrappedReceiveTokenAddress === longToken.address) {
      const shortToLongSwapPathStats = findSwapPath!(values.shortTokenUsd);
      if (!shortToLongSwapPathStats) {
        return values;
      }
      values.shortTokenUsd = 0n;
      values.shortTokenAmount = 0n;
      values.shortTokenSwapPathStats = shortToLongSwapPathStats;
      values.longTokenUsd += shortToLongSwapPathStats.usdOut;
      values.longTokenAmount = convertToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
    } else if (wrappedReceiveTokenAddress === shortToken.address) {
      const longToShortSwapPathStats = findSwapPath!(values.longTokenUsd);
      if (!longToShortSwapPathStats) {
        return values;
      }
      values.longTokenUsd = 0n;
      values.longTokenAmount = 0n;
      values.longTokenSwapPathStats = longToShortSwapPathStats;
      values.shortTokenUsd += longToShortSwapPathStats.usdOut;
      values.shortTokenAmount = convertToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    }
  } else {
    if (wrappedReceiveTokenAddress) {
      if (strategy === "byLongCollateral" && longPoolUsd > 0 && wrappedReceiveTokenAddress === longToken.address) {
        values.longTokenAmount = longTokenAmount;
        values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
        // Approximate and take long token usd as resulting market token usd
        values.longTokenBeforeSwapAmount = bigMath.mulDiv(values.longTokenAmount, longPoolUsd, totalPoolUsd);

        values.shortTokenAmount = 0n;
        values.shortTokenUsd = 0n;
        values.shortTokenBeforeSwapAmount = convertToTokenAmount(
          bigMath.mulDiv(values.longTokenUsd, shortPoolUsd, totalPoolUsd),
          shortToken.decimals,
          shortToken.prices.maxPrice
        )!;
        const shortTokenBeforeSwapAmountUsd = convertToUsd(
          values.shortTokenBeforeSwapAmount,
          shortToken.decimals,
          shortToken.prices.maxPrice
        )!;
        values.shortTokenSwapPathStats = findSwapPath!(shortTokenBeforeSwapAmountUsd);
      } else if (
        strategy === "byShortCollateral" &&
        shortPoolUsd > 0 &&
        wrappedReceiveTokenAddress === shortToken.address
      ) {
        values.shortTokenAmount = shortTokenAmount;
        values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
        // Approximate and take short token usd as resulting market token usd
        values.shortTokenBeforeSwapAmount = bigMath.mulDiv(values.shortTokenAmount, shortPoolUsd, totalPoolUsd);

        values.longTokenUsd = 0n;
        values.longTokenAmount = 0n;
        values.longTokenBeforeSwapAmount = convertToTokenAmount(
          bigMath.mulDiv(values.shortTokenUsd, longPoolUsd, totalPoolUsd),
          longToken.decimals,
          longToken.prices.maxPrice
        )!;
        const longTokenBeforeSwapAmountUsd = convertToUsd(
          values.longTokenBeforeSwapAmount,
          longToken.decimals,
          longToken.prices.maxPrice
        )!;
        values.longTokenSwapPathStats = findSwapPath!(longTokenBeforeSwapAmountUsd);
      }
    } else {
      if (isSameCollaterals) {
        const positiveAmount = bigMath.max(longTokenAmount, shortTokenAmount);
        values.longTokenAmount = positiveAmount / 2n;
        values.longTokenBeforeSwapAmount = values.longTokenAmount;
        values.shortTokenAmount = positiveAmount - values.longTokenAmount;
        values.shortTokenBeforeSwapAmount = values.shortTokenAmount;
        values.longTokenUsd = convertToUsd(values.longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
        values.shortTokenUsd = convertToUsd(values.shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
      } else if (strategy === "byLongCollateral" && longPoolUsd > 0) {
        values.longTokenAmount = longTokenAmount;
        values.longTokenBeforeSwapAmount = values.longTokenAmount;
        values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
        values.shortTokenUsd = bigMath.mulDiv(values.longTokenUsd, shortPoolUsd, longPoolUsd);
        values.shortTokenAmount = convertToTokenAmount(
          values.shortTokenUsd,
          shortToken.decimals,
          shortToken.prices.maxPrice
        )!;
        values.shortTokenBeforeSwapAmount = values.shortTokenAmount;
      } else if (strategy === "byShortCollateral" && shortPoolUsd > 0) {
        values.shortTokenAmount = shortTokenAmount;
        values.shortTokenBeforeSwapAmount = values.shortTokenAmount;
        values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
        values.longTokenUsd = bigMath.mulDiv(values.shortTokenUsd, longPoolUsd, shortPoolUsd);
        values.longTokenAmount = convertToTokenAmount(
          values.longTokenUsd,
          longToken.decimals,
          longToken.prices.maxPrice
        )!;
        values.longTokenBeforeSwapAmount = values.longTokenAmount;
      } else if (strategy === "byCollaterals") {
        values.longTokenAmount = longTokenAmount;
        values.longTokenBeforeSwapAmount = values.longTokenAmount;
        values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.maxPrice)!;
        values.shortTokenAmount = shortTokenAmount;
        values.shortTokenBeforeSwapAmount = values.shortTokenAmount;
        values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;

        values.uiFeeUsd = applyFactor(values.longTokenUsd + values.shortTokenUsd, uiFeeFactor);
        values.marketTokenUsd += values.uiFeeUsd;
      }
    }

    values.marketTokenUsd = values.marketTokenUsd + values.longTokenUsd + values.shortTokenUsd;
    if (!p.forShift) {
      values.swapFeeUsd = applyFactor(
        values.longTokenUsd + values.shortTokenUsd,
        p.marketInfo.swapFeeFactorForBalanceWasNotImproved
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
