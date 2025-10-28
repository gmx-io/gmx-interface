import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { ERC20Address } from "domain/tokens";
import { applyFactor } from "lib/numbers";
import { FindSwapPath, WithdrawalAmounts } from "sdk/types/trade";
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

    if (!wrappedReceiveTokenAddress) {
      values.longTokenAmount = convertToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
      values.shortTokenAmount = convertToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    } else if (wrappedReceiveTokenAddress === longToken.address) {
      const shortToLongSwapPathStats = findSwapPath!(values.shortTokenUsd);
      if (!shortToLongSwapPathStats) {
        throw new Error("Short to long swap path stats is not valid");
      }
      values.shortTokenUsd = 0n;
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
        throw new Error("Long to short swap path stats is not valid");
      }
      values.longTokenUsd = 0n;
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
        values.shortTokenUsd = 0n;
        values.shortTokenAmount = 0n;
      } else if (
        strategy === "byShortCollateral" &&
        shortPoolUsd > 0 &&
        wrappedReceiveTokenAddress === shortToken.address
      ) {
        values.shortTokenAmount = shortTokenAmount;
        values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
        values.longTokenUsd = 0n;
        values.longTokenAmount = 0n;
      }
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
