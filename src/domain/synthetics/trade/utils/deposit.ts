import { applySwapImpactWithCap, getPriceImpactForSwap, getSwapFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { applyFactor } from "lib/numbers";
import { DepositAmounts } from "sdk/types/trade";

export function getDepositAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  glvTokenAmount?: bigint;
  glvToken?: TokenData;
  marketTokenAmount: bigint;
  strategy: "byCollaterals" | "byMarketToken";
  includeLongToken: boolean;
  includeShortToken: boolean;
  uiFeeFactor: bigint;
  forShift?: boolean;
  isMarketTokenDeposit: boolean;
  glvInfo?: GlvInfo;
}): DepositAmounts {
  const {
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
    glvTokenAmount,
    marketTokenAmount,
    strategy,
    includeLongToken,
    includeShortToken,
    uiFeeFactor,
    isMarketTokenDeposit,
    glvInfo,
    glvToken,
  } = p;

  const longTokenPrice = longToken && getMidPrice(longToken.prices);
  const shortTokenPrice = shortToken && getMidPrice(shortToken.prices);

  const values: DepositAmounts = {
    longTokenAmount: 0n,
    longTokenUsd: 0n,
    shortTokenAmount: 0n,
    shortTokenUsd: 0n,
    marketTokenAmount: 0n,
    glvTokenAmount: 0n,
    glvTokenUsd: 0n,
    marketTokenUsd: 0n,
    swapFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
  };

  if (strategy === "byCollaterals") {
    if (longTokenAmount == 0n && shortTokenAmount == 0n && marketTokenAmount == 0n) {
      return values;
    }

    values.longTokenAmount = longTokenAmount;
    values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longTokenPrice)!;

    values.shortTokenAmount = shortTokenAmount;
    values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortTokenPrice)!;

    /**
     * If it's GM -> GLV deposit, then don't apply any fees or price impact, just convert GM to GLV
     */
    if (isMarketTokenDeposit && glvInfo && marketToken && glvToken) {
      const marketTokenUsd = convertToUsd(marketTokenAmount, marketToken.decimals, marketToken.prices.minPrice)!;
      const glvTokenAmount = convertToTokenAmount(marketTokenUsd, glvToken.decimals, glvToken.prices.minPrice) ?? 0n;
      const glvTokenUsd = convertToUsd(glvTokenAmount, glvToken.decimals, glvToken.prices.minPrice) ?? 0n;

      values.glvTokenAmount = glvTokenAmount;
      values.glvTokenUsd = glvTokenUsd;

      values.marketTokenAmount = marketTokenAmount ?? 0n;
      values.marketTokenUsd = marketTokenUsd;

      return values;
    }

    values.swapPriceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    const totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;

    if (values.longTokenUsd > 0) {
      const swapFeeUsd = p.forShift
        ? 0n
        : getSwapFee(marketInfo, values.longTokenUsd, values.swapPriceImpactDeltaUsd > 0);
      values.swapFeeUsd = values.swapFeeUsd + swapFeeUsd;

      const uiFeeUsd = applyFactor(values.longTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd + uiFeeUsd;

      values.marketTokenAmount += getMarketTokenAmountByCollateral({
        marketInfo,
        marketToken,
        tokenIn: longToken,
        tokenOut: shortToken,
        amount: values.longTokenAmount,
        priceImpactDeltaUsd: bigMath.mulDiv(values.swapPriceImpactDeltaUsd, values.longTokenUsd, totalDepositUsd),
        swapFeeUsd,
        uiFeeUsd,
      });
    }

    if (values.shortTokenUsd > 0) {
      const swapFeeUsd = p.forShift
        ? 0n
        : getSwapFee(marketInfo, values.shortTokenUsd, values.swapPriceImpactDeltaUsd > 0);
      values.swapFeeUsd = values.swapFeeUsd + swapFeeUsd;

      const uiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd + uiFeeUsd;

      values.marketTokenAmount += getMarketTokenAmountByCollateral({
        marketInfo,
        marketToken,
        tokenIn: shortToken,
        tokenOut: longToken,
        amount: values.shortTokenAmount,
        priceImpactDeltaUsd: bigMath.mulDiv(values.swapPriceImpactDeltaUsd, values.shortTokenUsd, totalDepositUsd),
        swapFeeUsd,
        uiFeeUsd,
      });
    }

    values.marketTokenUsd = convertToUsd(values.marketTokenAmount, marketToken.decimals, marketToken.prices.minPrice)!;

    if (glvInfo && glvToken) {
      values.glvTokenUsd = values.marketTokenUsd;
      values.glvTokenAmount = convertToTokenAmount(values.glvTokenUsd, glvToken.decimals, glvToken.prices.minPrice)!;
    }
  } else if (strategy === "byMarketToken") {
    if (glvInfo && glvTokenAmount == 0n) {
      return values;
    }

    if (!glvInfo && marketTokenAmount == 0n) {
      return values;
    }

    if (glvInfo && glvToken) {
      values.marketTokenUsd = convertToUsd(glvTokenAmount, glvToken.decimals, glvToken.prices.minPrice)!;
      values.marketTokenAmount = convertToTokenAmount(
        values.marketTokenUsd,
        marketToken.decimals,
        marketToken.prices.minPrice
      )!;
      values.glvTokenAmount = glvTokenAmount ?? 0n;
      values.glvTokenUsd = values.marketTokenUsd;
    } else {
      values.marketTokenAmount = marketTokenAmount;
      values.marketTokenUsd = marketTokenAmountToUsd(marketInfo, marketToken, marketTokenAmount);
    }

    /** No fees for GM to GLV deposits */
    if (glvInfo && isMarketTokenDeposit) {
      return values;
    }

    const prevLongTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longTokenPrice)!;
    const prevShortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortTokenPrice)!;
    const prevSumUsd = prevLongTokenUsd + prevShortTokenUsd;

    if (p.forShift) {
      // Reverse the withdrawal amounts
      const longPoolAmount = marketInfo.longPoolAmount;
      const shortPoolAmount = marketInfo.shortPoolAmount;

      const longPoolUsd = convertToUsd(longPoolAmount, longToken.decimals, longToken.prices.maxPrice)!;
      const shortPoolUsd = convertToUsd(shortPoolAmount, shortToken.decimals, shortToken.prices.maxPrice)!;
      const totalPoolUsd = longPoolUsd + shortPoolUsd;

      values.longTokenUsd = bigMath.mulDiv(values.marketTokenUsd, longPoolUsd, totalPoolUsd);
      values.shortTokenUsd = bigMath.mulDiv(values.marketTokenUsd, shortPoolUsd, totalPoolUsd);
    } else if (includeLongToken && includeShortToken && prevSumUsd > 0) {
      values.longTokenUsd = bigMath.mulDiv(values.marketTokenUsd, prevLongTokenUsd, prevSumUsd);
      values.shortTokenUsd = values.marketTokenUsd - values.longTokenUsd;
    } else if (includeLongToken) {
      values.longTokenUsd = values.marketTokenUsd;
    } else if (includeShortToken) {
      values.shortTokenUsd = values.marketTokenUsd;
    }

    values.swapPriceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    if (!p.forShift) {
      const swapFeeUsd = getSwapFee(marketInfo, values.marketTokenUsd, values.swapPriceImpactDeltaUsd > 0);
      values.swapFeeUsd = values.swapFeeUsd + swapFeeUsd;
    }

    const uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    values.uiFeeUsd = values.uiFeeUsd + uiFeeUsd;

    const totalFee = values.swapFeeUsd + values.uiFeeUsd;
    let totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;

    // Adjust long and short token amounts to account for swap fee, ui fee and price impact
    if (totalDepositUsd > 0) {
      values.longTokenUsd = values.longTokenUsd + bigMath.mulDiv(totalFee, values.longTokenUsd, totalDepositUsd);
      values.shortTokenUsd = values.shortTokenUsd + bigMath.mulDiv(totalFee, values.shortTokenUsd, totalDepositUsd);

      totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;

      // Ignore positive price impact
      if (values.swapPriceImpactDeltaUsd < 0 && totalDepositUsd > 0) {
        values.longTokenUsd =
          values.longTokenUsd + bigMath.mulDiv(-values.swapPriceImpactDeltaUsd, values.longTokenUsd, totalDepositUsd);

        values.shortTokenUsd =
          values.shortTokenUsd + bigMath.mulDiv(-values.swapPriceImpactDeltaUsd, values.shortTokenUsd, totalDepositUsd);
      }
    }

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longTokenPrice)!;
    values.shortTokenAmount = convertToTokenAmount(values.shortTokenUsd, shortToken.decimals, shortTokenPrice)!;
  }

  return values;
}

function getMarketTokenAmountByCollateral(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  tokenIn: TokenData;
  tokenOut: TokenData;
  amount: bigint;
  priceImpactDeltaUsd: bigint;
  swapFeeUsd: bigint;
  uiFeeUsd: bigint;
}): bigint {
  const { marketInfo, marketToken, tokenIn, tokenOut, amount, priceImpactDeltaUsd, swapFeeUsd, uiFeeUsd } = p;

  const swapFeeAmount = convertToTokenAmount(swapFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const uiFeeAmount = convertToTokenAmount(uiFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;

  let amountInAfterFees = amount - swapFeeAmount - uiFeeAmount;
  let mintAmount = 0n;

  if (priceImpactDeltaUsd > 0) {
    const { impactDeltaAmount: positiveImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenOut,
      priceImpactDeltaUsd
    );

    const usdValue = convertToUsd(positiveImpactAmount, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    mintAmount =
      mintAmount +
      // TODO: poolValue for deposit
      usdToMarketTokenAmount(marketInfo, marketToken, usdValue);
  } else {
    const { impactDeltaAmount: negativeImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenIn,
      priceImpactDeltaUsd
    );
    amountInAfterFees = amountInAfterFees + negativeImpactAmount;
  }

  const usdValue = convertToUsd(amountInAfterFees, tokenIn.decimals, tokenIn.prices.minPrice)!;
  mintAmount = mintAmount + usdToMarketTokenAmount(marketInfo, marketToken, usdValue);

  return mintAmount;
}
