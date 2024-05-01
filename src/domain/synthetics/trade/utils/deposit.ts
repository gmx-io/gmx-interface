import { applySwapImpactWithCap, getPriceImpactForSwap, getSwapFee } from "domain/synthetics/fees";
import { MarketInfo, marketTokenAmountToUsd, usdToMarketTokenAmount } from "domain/synthetics/markets";
import { TokenData, convertToTokenAmount, convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { DepositAmounts } from "../types";
import { applyFactor } from "lib/numbers";

export function getDepositAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  marketTokenAmount: bigint;
  strategy: "byCollaterals" | "byMarketToken";
  includeLongToken: boolean;
  includeShortToken: boolean;
  uiFeeFactor: bigint;
}): DepositAmounts {
  const {
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
    marketTokenAmount,
    strategy,
    includeLongToken,
    includeShortToken,
    uiFeeFactor,
  } = p;

  const longTokenPrice = getMidPrice(longToken.prices);
  const shortTokenPrice = getMidPrice(shortToken.prices);

  const values: DepositAmounts = {
    longTokenAmount: 0n,
    longTokenUsd: 0n,
    shortTokenAmount: 0n,
    shortTokenUsd: 0n,
    marketTokenAmount: 0n,
    marketTokenUsd: 0n,
    swapFeeUsd: 0n,
    uiFeeUsd: 0n,
    swapPriceImpactDeltaUsd: 0n,
  };

  if (strategy === "byCollaterals") {
    if (longTokenAmount == 0n && shortTokenAmount == 0n) {
      return values;
    }

    values.longTokenAmount = longTokenAmount;
    values.longTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longTokenPrice)!;
    values.shortTokenAmount = shortTokenAmount;
    values.shortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortTokenPrice)!;

    values.swapPriceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd
    );

    const totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

    if (values.longTokenUsd.gt(0)) {
      const swapFeeUsd = getSwapFee(marketInfo, values.longTokenUsd, values.swapPriceImpactDeltaUsd.gt(0));
      values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);

      const uiFeeUsd = applyFactor(values.longTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd.add(uiFeeUsd);

      values.marketTokenAmount = values.marketTokenAmount.add(
        getMarketTokenAmountByCollateral({
          marketInfo,
          marketToken,
          tokenIn: longToken,
          tokenOut: shortToken,
          amount: values.longTokenAmount,
          priceImpactDeltaUsd: values.swapPriceImpactDeltaUsd.mul(values.longTokenUsd).div(totalDepositUsd),
          swapFeeUsd,
          uiFeeUsd,
        })
      );
    }

    if (values.shortTokenUsd.gt(0)) {
      const swapFeeUsd = getSwapFee(marketInfo, values.shortTokenUsd, values.swapPriceImpactDeltaUsd.gt(0));
      values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);

      const uiFeeUsd = applyFactor(values.shortTokenUsd, uiFeeFactor);
      values.uiFeeUsd = values.uiFeeUsd.add(uiFeeUsd);

      values.marketTokenAmount = values.marketTokenAmount.add(
        getMarketTokenAmountByCollateral({
          marketInfo,
          marketToken,
          tokenIn: shortToken,
          tokenOut: longToken,
          amount: values.shortTokenAmount,
          priceImpactDeltaUsd: values.swapPriceImpactDeltaUsd.mul(values.shortTokenUsd).div(totalDepositUsd),
          swapFeeUsd,
          uiFeeUsd,
        })
      );
    }

    values.marketTokenUsd = convertToUsd(values.marketTokenAmount, marketToken.decimals, marketToken.prices.minPrice)!;
  } else if (strategy === "byMarketToken") {
    if (marketTokenAmount == 0n) {
      return values;
    }

    values.marketTokenAmount = marketTokenAmount;
    values.marketTokenUsd = marketTokenAmountToUsd(marketInfo, marketToken, marketTokenAmount);

    const prevLongTokenUsd = convertToUsd(longTokenAmount, longToken.decimals, longTokenPrice)!;
    const prevShortTokenUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortTokenPrice)!;
    const prevSumUsd = prevLongTokenUsd.add(prevShortTokenUsd);

    if (includeLongToken && includeShortToken && prevSumUsd.gt(0)) {
      values.longTokenUsd = values.marketTokenUsd.mul(prevLongTokenUsd).div(prevSumUsd);
      values.shortTokenUsd = values.marketTokenUsd.sub(values.longTokenUsd);
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

    const swapFeeUsd = getSwapFee(marketInfo, values.marketTokenUsd, values.swapPriceImpactDeltaUsd.gt(0));
    values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);

    const uiFeeUsd = applyFactor(values.marketTokenUsd, uiFeeFactor);
    values.uiFeeUsd = values.uiFeeUsd.add(uiFeeUsd);

    const totalFee = values.swapFeeUsd.add(values.uiFeeUsd);
    let totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

    // Adjust long and short token amounts to account for swap fee, ui fee and price impact
    if (totalDepositUsd.gt(0)) {
      values.longTokenUsd = values.longTokenUsd.add(totalFee.mul(values.longTokenUsd).div(totalDepositUsd));
      values.shortTokenUsd = values.shortTokenUsd.add(totalFee.mul(values.shortTokenUsd).div(totalDepositUsd));

      totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

      // Ignore positive price impact
      if (values.swapPriceImpactDeltaUsd.lt(0) && totalDepositUsd.gt(0)) {
        values.longTokenUsd = values.longTokenUsd.add(
          values.swapPriceImpactDeltaUsd.mul(-1).mul(values.longTokenUsd).div(totalDepositUsd)
        );

        values.shortTokenUsd = values.shortTokenUsd.add(
          values.swapPriceImpactDeltaUsd.mul(-1).mul(values.shortTokenUsd).div(totalDepositUsd)
        );
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
}): BigNumber {
  const { marketInfo, marketToken, tokenIn, tokenOut, amount, priceImpactDeltaUsd, swapFeeUsd, uiFeeUsd } = p;

  const swapFeeAmount = convertToTokenAmount(swapFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;
  const uiFeeAmount = convertToTokenAmount(uiFeeUsd, tokenIn.decimals, tokenIn.prices.minPrice)!;

  let amountInAfterFees = amount.sub(swapFeeAmount).sub(uiFeeAmount);
  let mintAmount = 0n;

  if (priceImpactDeltaUsd.gt(0)) {
    const positiveImpactAmount = applySwapImpactWithCap(marketInfo, tokenOut, priceImpactDeltaUsd);

    const usdValue = convertToUsd(positiveImpactAmount, tokenOut.decimals, tokenOut.prices.maxPrice)!;

    mintAmount = mintAmount.add(
      // TODO: poolValue for deposit
      usdToMarketTokenAmount(marketInfo, marketToken, usdValue)
    );
  } else {
    const negativeImpactAmount = applySwapImpactWithCap(marketInfo, tokenIn, priceImpactDeltaUsd);
    amountInAfterFees = amountInAfterFees.sub(negativeImpactAmount.mul(-1));
  }

  const usdValue = convertToUsd(amountInAfterFees, tokenIn.decimals, tokenIn.prices.minPrice)!;
  mintAmount = mintAmount.add(usdToMarketTokenAmount(marketInfo, marketToken, usdValue));

  return mintAmount;
}
