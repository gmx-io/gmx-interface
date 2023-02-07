export function getIncreaseOrderAmounts(p: {
  data: {
    marketsData: MarketsData;
    poolsData: MarketsPoolsData;
    tokensData: TokensData;
    openInterestData: MarketsOpenInterestData;
    feesConfigs: MarketsFeesConfigsData;
  };
  indexToken?: TokenData;
  market?: Market;
  initialCollateral?: TokenData;
  targetCollateral?: TokenData;
  initialCollateralAmount?: BigNumber;
  indexTokenAmount?: BigNumber;
  isLong: boolean;
  leverage?: BigNumber;
  triggerPrice?: BigNumber;
  findSwapPath: (usdIn: BigNumber) => { swapPath: string[]; swapPathStats: SwapPathStats } | undefined;
  prevSwapPath?: string[];
}): IncreaseTradeParams | undefined {
  if (
    (!p.initialCollateralAmount && !p.indexTokenAmount) ||
    !p.market ||
    !p.initialCollateral?.prices ||
    !p.indexToken?.prices ||
    !p.targetCollateral?.prices
  ) {
    return undefined;
  }

  let swapFees: SwapPathStats | undefined;
  let swapPath: string[] | undefined;
  let sizeDeltaUsd: BigNumber;
  let sizeDeltaAfterFeesUsd: BigNumber;
  let sizeDeltaInTokens: BigNumber;
  let positionFee: FeeItem | undefined;
  let priceImpact: FeeItem | undefined;
  let collateralAmount: BigNumber;
  let initialCollateralAmount: BigNumber;
  let collateralUsd: BigNumber;

  const initialCollateral = getTokenData(p.data.tokensData, p.initialCollateral.address, "wrapped")!;

  if (!p.indexTokenAmount) {
    // calculate indexTokenAmount by initialCollateralAmount
    initialCollateralAmount = p.initialCollateralAmount!;

    if (p.targetCollateral.address === initialCollateral.address) {
      collateralAmount = p.initialCollateralAmount!;
      collateralUsd = convertToUsd(collateralAmount, initialCollateral.decimals, initialCollateral.prices!.minPrice)!;
      swapPath = [];
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: initialCollateral,
        toToken: p.targetCollateral,
        fromAmount: p.initialCollateralAmount!,
        findSwapPath: p.findSwapPath,
      });

      if (swapAmounts) {
        collateralAmount = swapAmounts.toAmount;
        collateralUsd = swapAmounts.toUsd;
        swapFees = swapAmounts.swapFees;
        swapPath = swapAmounts.swapPath;
      } else {
        return undefined;
      }
    }

    sizeDeltaUsd = collateralUsd;

    if (p.leverage) {
      sizeDeltaUsd = sizeDeltaUsd.mul(p.leverage).div(BASIS_POINTS_DIVISOR);
    }

    positionFee = getPositionFee(p.data.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd, collateralUsd);
    sizeDeltaAfterFeesUsd = sizeDeltaUsd.add(positionFee?.deltaUsd || 0);

    const priceImpactDeltaUsd = getPriceImpactForPosition(
      p.data.openInterestData,
      p.data.feesConfigs,
      p.market.marketTokenAddress,
      sizeDeltaUsd,
      p.isLong
    );

    if (priceImpactDeltaUsd) {
      priceImpact = {
        deltaUsd: priceImpactDeltaUsd,
        bps: getBasisPoints(priceImpactDeltaUsd, collateralUsd),
      };
      sizeDeltaAfterFeesUsd = sizeDeltaAfterFeesUsd.add(priceImpactDeltaUsd);
    }

    const price = p.triggerPrice || (p.isLong ? p.indexToken.prices.maxPrice : p.indexToken.prices.minPrice);

    const sizeDeltaInTokens = convertToTokenAmount(sizeDeltaUsd, p.indexToken.decimals, price)!;
    const sizeDeltaAfterFeesInTokens = convertToTokenAmount(sizeDeltaAfterFeesUsd, p.indexToken.decimals, price)!;

    return {
      market: p.market,
      swapPath,
      swapFees,
      positionFee,
      priceImpact,
      sizeDeltaInTokens,
      collateralAmount,
      initialCollateralAmount,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      sizeDeltaUsd,
      collateralUsd,
    };
  } else {
    // calculate initialCollateralAmount by indexTokenAmount
    const price = p.triggerPrice || (p.isLong ? p.indexToken.prices.minPrice : p.indexToken.prices.maxPrice);
    sizeDeltaInTokens = p.indexTokenAmount;
    const sizeDeltaAfterFeesInTokens = sizeDeltaInTokens;
    sizeDeltaUsd = convertToUsd(p.indexTokenAmount, p.indexToken.decimals, price)!;
    sizeDeltaAfterFeesUsd = sizeDeltaUsd;

    const priceImpactDeltaUsd = getPriceImpactForPosition(
      p.data.openInterestData,
      p.data.feesConfigs,
      p.market.marketTokenAddress,
      sizeDeltaUsd,
      p.isLong
    );

    collateralUsd = sizeDeltaUsd;

    if (p.leverage) {
      collateralUsd = collateralUsd.mul(BASIS_POINTS_DIVISOR).div(p.leverage);
    }

    positionFee = getPositionFee(p.data.feesConfigs, p.market.marketTokenAddress, sizeDeltaUsd, collateralUsd);

    // TODO or acceptable price?
    if (priceImpactDeltaUsd) {
      priceImpact = {
        deltaUsd: priceImpactDeltaUsd,
        bps: getBasisPoints(priceImpactDeltaUsd, collateralUsd),
      };
    }

    collateralUsd = collateralUsd.add(positionFee?.deltaUsd || 0).add(priceImpactDeltaUsd || 0);
    collateralAmount = convertToTokenAmount(
      collateralUsd,
      p.targetCollateral.decimals,
      p.targetCollateral.prices.minPrice
    )!;

    if (p.targetCollateral.address === initialCollateral.address) {
      swapPath = [];
      initialCollateralAmount = collateralAmount;
    } else {
      const swapAmounts = getSwapAmounts({
        data: p.data,
        fromToken: initialCollateral,
        toToken: p.targetCollateral,
        toAmount: collateralAmount,
        findSwapPath: p.findSwapPath,
      });

      if (swapAmounts) {
        initialCollateralAmount = swapAmounts.fromAmount;
        swapFees = swapAmounts.swapFees;
        swapPath = swapAmounts.swapPath;

        if (positionFee && swapAmounts.fromUsd.gt(0)) {
          positionFee.bps = getBasisPoints(positionFee.deltaUsd, swapAmounts.fromUsd);
        }

        if (priceImpact && swapAmounts.fromUsd.gt(0)) {
          priceImpact.bps = getBasisPoints(priceImpact.deltaUsd, swapAmounts.fromUsd);
        }
      } else {
        return undefined;
      }
    }

    return {
      market: p.market,
      swapPath,
      swapFees,
      positionFee,
      priceImpact,
      sizeDeltaInTokens,
      collateralAmount,
      initialCollateralAmount,
      sizeDeltaAfterFeesUsd,
      sizeDeltaAfterFeesInTokens,
      sizeDeltaUsd,
      collateralUsd,
    };
  }
}
