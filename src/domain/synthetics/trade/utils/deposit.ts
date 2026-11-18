import { applySwapImpactWithCap, getPriceImpactForSwap, getSwapFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { applyFactor, roundUpDivision } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { SwapPricingType } from "sdk/utils/orders/types";
import { DepositAmounts, FindSwapPath } from "sdk/utils/trade/types";

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
  initialShortToken?: TokenData;
  initialShortTokenAmount?: bigint;
  findSwapPath?: FindSwapPath;
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
    initialShortToken,
    initialShortTokenAmount,
    findSwapPath,
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
    if (initialShortToken && findSwapPath && initialShortTokenAmount !== undefined && initialShortTokenAmount > 0n) {
      const initialShortTokenUsd = convertToUsd(
        initialShortTokenAmount,
        initialShortToken.decimals,
        initialShortToken.prices.minPrice
      )!;

      values.shortTokenSwapPathStats = findSwapPath(initialShortTokenUsd);

      if (values.shortTokenSwapPathStats) {
        values.initialShortTokenAmount = initialShortTokenAmount;
      }
    }

    const depositShortTokenAmount = values.shortTokenSwapPathStats?.amountOut ?? shortTokenAmount;

    if (longTokenAmount == 0n && depositShortTokenAmount == 0n && marketTokenAmount == 0n) {
      return values;
    }

    values.longTokenAmount = longTokenAmount;
    values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longTokenPrice)!;

    values.shortTokenAmount = depositShortTokenAmount;
    values.shortTokenUsd = convertToUsd(depositShortTokenAmount, shortToken.decimals, shortTokenPrice)!;

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

    const priceImpactValues = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    values.swapPriceImpactDeltaUsd = priceImpactValues.priceImpactDeltaUsd;

    const totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;

    if (values.longTokenUsd > 0) {
      const swapFeeUsd = p.forShift
        ? 0n
        : getSwapFee(marketInfo, values.longTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Swap);
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
        : getSwapFee(marketInfo, values.shortTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Swap);
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

    const priceImpactValues = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    const swapFeeUsd = p.forShift
      ? 0n
      : getSwapFee(marketInfo, values.marketTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Swap);
    const uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    const totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;

    // Starting estimate only, getDepositAmountsForReceive refines it against the forward quote
    if (totalDepositUsd > 0) {
      const costUsd = swapFeeUsd + uiFeeUsd - priceImpactValues.priceImpactDeltaUsd;

      values.longTokenUsd = values.longTokenUsd + bigMath.mulDiv(costUsd, values.longTokenUsd, totalDepositUsd);
      values.shortTokenUsd = values.shortTokenUsd + bigMath.mulDiv(costUsd, values.shortTokenUsd, totalDepositUsd);
    }

    values.longTokenAmount = convertToTokenAmount(values.longTokenUsd, longToken.decimals, longTokenPrice)!;
    values.shortTokenAmount = convertToTokenAmount(values.shortTokenUsd, shortToken.decimals, shortTokenPrice)!;

    if (initialShortToken && findSwapPath && values.shortTokenUsd > 0n) {
      const preferredUsdOut = values.shortTokenUsd;
      const approximateUsdIn = preferredUsdOut;
      const approximateSwapPathStats = findSwapPath(approximateUsdIn);

      if (approximateSwapPathStats && approximateSwapPathStats.usdOut > 0n) {
        const adjustedUsdIn = bigMath.mulDiv(approximateUsdIn, preferredUsdOut, approximateSwapPathStats.usdOut);

        values.initialShortTokenAmount = convertToTokenAmount(
          adjustedUsdIn,
          initialShortToken.decimals,
          initialShortToken.prices.minPrice
        );
      }
    }

    return getDepositAmountsForReceive(p, values);
  }

  return values;
}

type DepositPayAmounts = Pick<DepositAmounts, "longTokenAmount" | "shortTokenAmount" | "initialShortTokenAmount">;

const RECEIVE_QUOTE_PROPORTIONAL_STEPS = 2;
const RECEIVE_QUOTE_MAX_STEPS = 10;

// Pay amounts, fees and impact come from the forward quote, so they match a Pay-driven quote of the same collateral
function getDepositAmountsForReceive(
  p: Parameters<typeof getDepositAmounts>[0],
  estimate: DepositAmounts
): DepositAmounts {
  const isGlv = Boolean(p.glvInfo && p.glvToken);
  const getReceiveAmount = (amounts: DepositAmounts) => (isGlv ? amounts.glvTokenAmount : amounts.marketTokenAmount);
  const getForwardQuote = (pay: DepositPayAmounts) =>
    getDepositAmounts({ ...p, ...pay, strategy: "byCollaterals", marketTokenAmount: 0n, glvTokenAmount: 0n });
  const targetAmount = getReceiveAmount(estimate);

  let pay: DepositPayAmounts = {
    longTokenAmount: estimate.longTokenAmount,
    shortTokenAmount: estimate.shortTokenAmount,
    initialShortTokenAmount: estimate.initialShortTokenAmount,
  };
  let quote = getForwardQuote(pay);
  let quotedAmount = getReceiveAmount(quote);

  for (let step = 0; step < RECEIVE_QUOTE_MAX_STEPS && quotedAmount > 0n; step++) {
    const isShort = quotedAmount < targetAmount;
    // Mint is concave in the pay amount, so proportional steps approach the target without crossing it;
    // from below, overshoot by the remaining gap once it is small
    const stepTargetAmount =
      isShort && step >= RECEIVE_QUOTE_PROPORTIONAL_STEPS ? 2n * targetAmount - quotedAmount : targetAmount;
    const scale = (amount: bigint) => roundUpDivision(amount * stepTargetAmount, quotedAmount);

    const nextPay = {
      longTokenAmount: scale(pay.longTokenAmount),
      shortTokenAmount: scale(pay.shortTokenAmount),
      initialShortTokenAmount:
        pay.initialShortTokenAmount === undefined ? undefined : scale(pay.initialShortTokenAmount),
    };
    const nextQuote = getForwardQuote(nextPay);
    const nextQuotedAmount = getReceiveAmount(nextQuote);

    // Stops past the most the market can mint for this split, or when rounding no longer tightens the quote
    const isImproved = isShort
      ? nextQuotedAmount > quotedAmount
      : nextQuotedAmount >= targetAmount && nextQuotedAmount < quotedAmount;

    if (!isImproved) {
      break;
    }

    pay = nextPay;
    quote = nextQuote;
    quotedAmount = nextQuotedAmount;
  }

  // Paired inputs are filled from this quote and set the next one's split, so keep them once they mint
  // the target as tightly, otherwise rounding makes them drift on every recalculation
  if (p.includeLongToken && p.includeShortToken) {
    const currentQuote = getForwardQuote({
      longTokenAmount: p.longTokenAmount,
      shortTokenAmount: p.shortTokenAmount,
      initialShortTokenAmount: p.initialShortTokenAmount,
    });
    const currentQuotedAmount = getReceiveAmount(currentQuote);

    if (currentQuotedAmount >= targetAmount && currentQuotedAmount <= quotedAmount) {
      quote = currentQuote;
      quotedAmount = currentQuotedAmount;
    }
  }

  // Never display more than the submitted collateral mints
  if (quotedAmount < targetAmount) {
    return quote;
  }

  return {
    ...quote,
    marketTokenAmount: estimate.marketTokenAmount,
    marketTokenUsd: estimate.marketTokenUsd,
    glvTokenAmount: estimate.glvTokenAmount,
    glvTokenUsd: estimate.glvTokenUsd,
  };
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
