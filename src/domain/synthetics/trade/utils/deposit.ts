import { applySwapImpactWithCap, getPriceImpactForDeposit, getSwapFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { applyFactor, expandDecimals, roundUpDivision } from "lib/numbers";
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
  // Unknown until loaded, then the whole fee counts as staying in the pool, which only lowers the quote
  swapFeeReceiverFactor?: bigint;
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
      const glvTokenAmount = convertToTokenAmount(marketTokenUsd, glvToken.decimals, glvToken.prices.maxPrice) ?? 0n;
      const glvTokenUsd = convertToUsd(glvTokenAmount, glvToken.decimals, glvToken.prices.maxPrice) ?? 0n;

      values.glvTokenAmount = glvTokenAmount;
      values.glvTokenUsd = glvTokenUsd;

      values.marketTokenAmount = marketTokenAmount ?? 0n;
      values.marketTokenUsd = marketTokenUsd;

      return values;
    }

    const priceImpactValues = getPriceImpactForDeposit(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    const { priceImpactDeltaUsd } = priceImpactValues;
    const totalDepositUsd = values.longTokenUsd + values.shortTokenUsd;
    let shortLegMarketInfo = marketInfo;
    let shortLegMarketToken = marketToken;

    if (values.longTokenUsd > 0) {
      const swapFeeUsd = p.forShift
        ? 0n
        : getSwapFee(marketInfo, values.longTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Deposit);
      values.swapFeeUsd = values.swapFeeUsd + swapFeeUsd;

      const uiFeeUsd = applyFactor(values.longTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd + uiFeeUsd;

      const longMint = getMarketTokenAmountByCollateral({
        marketInfo,
        marketToken,
        tokenIn: longToken,
        tokenOut: shortToken,
        amount: values.longTokenAmount,
        priceImpactDeltaUsd: bigMath.mulDiv(priceImpactDeltaUsd, values.longTokenUsd, totalDepositUsd),
        swapFeeUsd,
        uiFeeUsd,
        swapFeeReceiverFactor: p.swapFeeReceiverFactor ?? 0n,
      });
      values.marketTokenAmount += longMint.mintAmount;
      values.swapPriceImpactDeltaUsd += longMint.priceImpactDeltaUsd;

      // The contract mints the short leg against the pool value and supply the long leg leaves,
      // a same-collateral deposit runs as one leg
      if (!marketInfo.isSameCollaterals) {
        shortLegMarketInfo = { ...marketInfo, poolValueMax: marketInfo.poolValueMax + longMint.poolValueDeltaUsd };
        shortLegMarketToken = { ...marketToken, totalSupply: marketToken.totalSupply! + longMint.mintAmount };
      }
    }

    if (values.shortTokenUsd > 0) {
      const swapFeeUsd = p.forShift
        ? 0n
        : getSwapFee(marketInfo, values.shortTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Deposit);
      values.swapFeeUsd = values.swapFeeUsd + swapFeeUsd;

      const uiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd + uiFeeUsd;

      const shortMint = getMarketTokenAmountByCollateral({
        marketInfo: shortLegMarketInfo,
        marketToken: shortLegMarketToken,
        tokenIn: shortToken,
        tokenOut: longToken,
        amount: values.shortTokenAmount,
        priceImpactDeltaUsd: bigMath.mulDiv(priceImpactDeltaUsd, values.shortTokenUsd, totalDepositUsd),
        swapFeeUsd,
        uiFeeUsd,
        swapFeeReceiverFactor: p.swapFeeReceiverFactor ?? 0n,
      });
      values.marketTokenAmount += shortMint.mintAmount;
      values.swapPriceImpactDeltaUsd += shortMint.priceImpactDeltaUsd;
    }

    values.marketTokenUsd = convertToUsd(values.marketTokenAmount, marketToken.decimals, marketToken.prices.minPrice)!;

    if (glvInfo && glvToken) {
      values.glvTokenUsd = values.marketTokenUsd;
      // GLV deposits mint against the maximized GLV value
      values.glvTokenAmount = convertToTokenAmount(values.glvTokenUsd, glvToken.decimals, glvToken.prices.maxPrice)!;
    }
  } else if (strategy === "byMarketToken") {
    if (glvInfo && glvTokenAmount == 0n) {
      return values;
    }

    if (!glvInfo && marketTokenAmount == 0n) {
      return values;
    }

    if (glvInfo && glvToken) {
      // Rounded up, so the GM paid for the typed GLV amount mints at least that amount back
      values.marketTokenUsd = roundUpDivision(
        (glvTokenAmount ?? 0n) * glvToken.prices.maxPrice,
        expandDecimals(1, glvToken.decimals)
      );
      values.marketTokenAmount = roundUpDivision(
        values.marketTokenUsd * expandDecimals(1, marketToken.decimals),
        marketToken.prices.minPrice
      );
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

    const priceImpactValues = getPriceImpactForDeposit(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    const swapFeeUsd = p.forShift
      ? 0n
      : getSwapFee(marketInfo, values.marketTokenUsd, priceImpactValues.balanceWasImproved, SwapPricingType.Deposit);
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

type ReceiveQuote = { pay: DepositPayAmounts; amounts: DepositAmounts; receiveAmount: bigint };

const RECEIVE_QUOTE_PROPORTIONAL_STEPS = 2;
const RECEIVE_QUOTE_MAX_STEPS = 12;
const RECEIVE_QUOTE_STALL_STEP = RECEIVE_QUOTE_MAX_STEPS / 2;
// Tightening stops once a quote mints at most 1 ppm over the typed Receive amount
const RECEIVE_QUOTE_TOLERANCE_DIVISOR = 1_000_000n;
const MINT_PEAK_BRACKET_STEPS = 40;
const MINT_PEAK_SEARCH_STEPS = 10;
const MINT_PEAK_SEARCH_PRECISION = 1_000_000n;

// Pay amounts, fees and impact come from the forward quote, so they match a Pay-driven quote of the same collateral
function getDepositAmountsForReceive(
  p: Parameters<typeof getDepositAmounts>[0],
  estimate: DepositAmounts
): DepositAmounts {
  // GLV pool ranking quotes every pool before Pay has a token to split the receive amount into
  if (!p.includeLongToken && !p.includeShortToken) {
    return estimate;
  }

  const isGlv = Boolean(p.glvInfo && p.glvToken);
  const targetAmount = isGlv ? estimate.glvTokenAmount : estimate.marketTokenAmount;
  const toleranceAmount = targetAmount / RECEIVE_QUOTE_TOLERANCE_DIVISOR;
  const quotes: ReceiveQuote[] = [];

  const getQuote = (pay: DepositPayAmounts): ReceiveQuote => {
    const amounts = getDepositAmounts({
      ...p,
      ...pay,
      strategy: "byCollaterals",
      marketTokenAmount: 0n,
      glvTokenAmount: 0n,
    });
    const quote = { pay, amounts, receiveAmount: isGlv ? amounts.glvTokenAmount : amounts.marketTokenAmount };
    quotes.push(quote);

    return quote;
  };
  const getIsWithinTolerance = (quote: ReceiveQuote) =>
    quote.receiveAmount >= targetAmount && quote.receiveAmount <= targetAmount + toleranceAmount;
  const getAmountsWithTarget = (quote: ReceiveQuote): DepositAmounts => ({
    ...quote.amounts,
    marketTokenAmount: estimate.marketTokenAmount,
    marketTokenUsd: estimate.marketTokenUsd,
    glvTokenAmount: estimate.glvTokenAmount,
    glvTokenUsd: estimate.glvTokenUsd,
  });

  // Paired inputs are filled from this quote and set the next one's split, so rounding would move them on every
  // recalculation; keep them unless a fresh quote is tighter by more than the tolerance
  const currentQuote =
    p.includeLongToken && p.includeShortToken
      ? getQuote({
          longTokenAmount: p.longTokenAmount,
          shortTokenAmount: p.shortTokenAmount,
          initialShortTokenAmount: p.initialShortTokenAmount,
        })
      : undefined;

  if (currentQuote && getIsWithinTolerance(currentQuote)) {
    return getAmountsWithTarget(currentQuote);
  }

  let quote = getQuote({
    longTokenAmount: estimate.longTokenAmount,
    shortTokenAmount: estimate.shortTokenAmount,
    initialShortTokenAmount: estimate.initialShortTokenAmount,
  });
  let lostMintSteps = 0;
  let hasSearchedMintPeak = false;

  for (let step = 0; step < RECEIVE_QUOTE_MAX_STEPS && !getIsWithinTolerance(quote); step++) {
    const isBelowTarget = quote.receiveAmount < targetAmount;

    // Search where the mint peaks when the pay is past it (a mint at or below zero, or losing mint right from
    // the estimate or twice in a row) or when steps stall below the target on the flat top of the curve
    const isPastMintPeak = quote.receiveAmount <= 0n || lostMintSteps > 1 || (lostMintSteps > 0 && step === 1);

    if (isBelowTarget && (isPastMintPeak || step === RECEIVE_QUOTE_STALL_STEP)) {
      if (hasSearchedMintPeak) {
        break;
      }

      hasSearchedMintPeak = true;
      searchMintPeak(getQuote, scalePayAmounts(quote.pay, 2n, 1n));

      const cheapestQuote = getCheapestReceiveQuote(quotes, targetAmount);

      if (!cheapestQuote) {
        break;
      }

      quote = cheapestQuote;
      lostMintSteps = 0;
      continue;
    }

    // Mint per unit of pay never rises with the deposit size, so a proportional step stays on its side of the target;
    // from below, the later steps overshoot by the remaining gap to cross it
    const stepTargetAmount =
      isBelowTarget && step >= RECEIVE_QUOTE_PROPORTIONAL_STEPS
        ? 2n * targetAmount - quote.receiveAmount
        : targetAmount;
    const nextQuote = getQuote(scalePayAmounts(quote.pay, stepTargetAmount, quote.receiveAmount));

    if (getIsSamePayAmounts(nextQuote.pay, quote.pay)) {
      break;
    }

    // A single loss on the way up can be a fee tier or impact switch in the curve, so keep stepping from it
    lostMintSteps = isBelowTarget && nextQuote.receiveAmount <= quote.receiveAmount ? lostMintSteps + 1 : 0;
    quote = nextQuote;
  }

  const cheapestQuote = getCheapestReceiveQuote(quotes, targetAmount);

  if (cheapestQuote) {
    const isCurrentKept =
      currentQuote !== undefined &&
      currentQuote.receiveAmount >= targetAmount &&
      currentQuote.receiveAmount - cheapestQuote.receiveAmount <= toleranceAmount;

    return getAmountsWithTarget(isCurrentKept ? currentQuote : cheapestQuote);
  }

  // Unreachable target: report what the closest pay mints, so Receive validation shows the shortfall
  return quotes.reduce((highest, next) => (next.receiveAmount > highest.receiveAmount ? next : highest)).amounts;
}

// Ternary search below maxPay for the pay that mints the most, getQuote keeps every quote it takes
function searchMintPeak(getQuote: (pay: DepositPayAmounts) => ReceiveQuote, maxPay: DepositPayAmounts) {
  // From far past the peak a ternary search over the whole range never samples near it, so halve down to it first
  let upperQuote = getQuote(maxPay);

  for (let step = 0; step < MINT_PEAK_BRACKET_STEPS; step++) {
    const halfQuote = getQuote(scalePayAmounts(upperQuote.pay, 1n, 2n));

    if (halfQuote.receiveAmount <= upperQuote.receiveAmount) {
      break;
    }

    upperQuote = halfQuote;
  }

  const searchPay = scalePayAmounts(upperQuote.pay, 2n, 1n);
  let low = 0n;
  let high = MINT_PEAK_SEARCH_PRECISION;

  for (let step = 0; step < MINT_PEAK_SEARCH_STEPS; step++) {
    const third = (high - low) / 3n;
    const left = getQuote(scalePayAmounts(searchPay, low + third, MINT_PEAK_SEARCH_PRECISION));
    const right = getQuote(scalePayAmounts(searchPay, high - third, MINT_PEAK_SEARCH_PRECISION));

    if (left.receiveAmount < right.receiveAmount) {
      low += third;
    } else {
      high -= third;
    }
  }
}

// Past the peak a larger pay can mint the same, so pick by pay rather than by the closest mint
function getCheapestReceiveQuote(quotes: ReceiveQuote[], targetAmount: bigint): ReceiveQuote | undefined {
  let cheapestQuote: ReceiveQuote | undefined;

  for (const quote of quotes) {
    if (
      quote.receiveAmount >= targetAmount &&
      (cheapestQuote === undefined || getPayUsd(quote) < getPayUsd(cheapestQuote))
    ) {
      cheapestQuote = quote;
    }
  }

  return cheapestQuote;
}

function getPayUsd(quote: ReceiveQuote) {
  return quote.amounts.longTokenUsd + quote.amounts.shortTokenUsd;
}

function scalePayAmounts(pay: DepositPayAmounts, numerator: bigint, denominator: bigint): DepositPayAmounts {
  const scale = (amount: bigint) => roundUpDivision(amount * numerator, denominator);

  return {
    longTokenAmount: scale(pay.longTokenAmount),
    shortTokenAmount: scale(pay.shortTokenAmount),
    initialShortTokenAmount: pay.initialShortTokenAmount === undefined ? undefined : scale(pay.initialShortTokenAmount),
  };
}

function getIsSamePayAmounts(a: DepositPayAmounts, b: DepositPayAmounts) {
  return (
    a.longTokenAmount === b.longTokenAmount &&
    a.shortTokenAmount === b.shortTokenAmount &&
    a.initialShortTokenAmount === b.initialShortTokenAmount
  );
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
  swapFeeReceiverFactor: bigint;
}): { mintAmount: bigint; priceImpactDeltaUsd: bigint; poolValueDeltaUsd: bigint } {
  const { marketInfo, marketToken, tokenIn, tokenOut, amount, swapFeeUsd, uiFeeUsd, swapFeeReceiverFactor } = p;

  const swapFeeAmount = convertToTokenAmount(swapFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const uiFeeAmount = convertToTokenAmount(uiFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;

  let amountInAfterFees = amount - swapFeeAmount - uiFeeAmount;
  let mintAmount = 0n;
  let priceImpactDeltaUsd = p.priceImpactDeltaUsd;

  if (priceImpactDeltaUsd > 0) {
    const { impactDeltaAmount: positiveImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenOut,
      priceImpactDeltaUsd
    );

    // Unlike a swap, a deposit drops the positive impact that exceeds the impact pool
    priceImpactDeltaUsd = convertToUsd(positiveImpactAmount, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    mintAmount =
      mintAmount +
      // TODO: poolValue for deposit
      usdToMarketTokenAmount(marketInfo, marketToken, priceImpactDeltaUsd);
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

  // The pool keeps the deposit and its share of the fee, plus the positive impact paid from the impact pool,
  // valued at the max price like the maximized pool value
  const poolFeeAmount = swapFeeAmount - applyFactor(swapFeeAmount, swapFeeReceiverFactor);
  const poolValueDeltaUsd =
    convertToUsd(amountInAfterFees + poolFeeAmount, tokenIn.decimals, tokenIn.prices.maxPrice)! +
    (priceImpactDeltaUsd > 0 ? priceImpactDeltaUsd : 0n);

  return { mintAmount, priceImpactDeltaUsd, poolValueDeltaUsd };
}
