import { MarketsFeesConfigsData } from "domain/synthetics/fees";
import { Market, MarketsData, MarketsOpenInterestData, MarketsPoolsData } from "domain/synthetics/markets";
import { AggregatedPositionData, Position, getPriceForPnl } from "domain/synthetics/positions";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { DUST_USD } from "lib/legacy";
import { DecreasePositionTradeParams, NextPositionValues } from "../types";

export function getDecreasePositionTradeParams(p: {
  marketsData: MarketsData;
  poolsData: MarketsPoolsData;
  tokensData: TokensData;
  openInterestData: MarketsOpenInterestData;
  feesConfigs: MarketsFeesConfigsData;
  market: Market;
  collateralToken: TokenData;
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  keepLeverage?: boolean;
  showPnlInLeverage?: boolean;
  allowedSlippage?: number;
  isLong?: boolean;
}): DecreasePositionTradeParams {
  const indexToken = getTokenData(p.tokensData, p.market.indexTokenAddress);

  const sizeDeltaUsd = p.sizeDeltaUsd || BigNumber.from(0);

  const sizeDeltaInTokens =
    convertToTokenAmount(sizeDeltaUsd, indexToken?.decimals, indexToken?.prices?.maxPrice) || BigNumber.from(0);

  const isClosing = getIsClosing({
    sizeDeltaUsd: p.sizeDeltaUsd,
    existingPosition: p.existingPosition,
  });

  const collateralDeltaUsd = getCollateralDeltaUsdForDecreaseTrade({
    isClosing,
    keepLeverage: p.keepLeverage,
    sizeDeltaUsd: p.sizeDeltaUsd,
    existingPosition: p.existingPosition,
  });

  const collateralDeltaAmount =
    convertToTokenAmount(
      collateralDeltaUsd,
      p.existingPosition?.collateralToken?.decimals,
      p.existingPosition?.collateralToken?.prices?.maxPrice
    ) || BigNumber.from(0);

  const pnlToken = p.isLong
    ? getTokenData(p.tokensData, p.market.longTokenAddress)
    : getTokenData(p.tokensData, p.market.shortTokenAddress);

  const nextCollateralUsd = getNextCollateralUsdForDecreaseOrder({
    isClosing,
    collateralUsd: p.existingPosition?.collateralUsd,
    collateralDeltaUsd,
    sizeDeltaUsd: p.sizeDeltaUsd,
    pnl: p.existingPosition?.pnl,
  });

  const collateralOutAmount = getCollateralOutForDecreaseOrder({
    position: p.existingPosition,
    indexToken: p.existingPosition?.indexToken,
    collateralToken: p.collateralToken,
    sizeDeltaUsd: p.sizeDeltaUsd || BigNumber.from(0),
    collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
    pnlToken: p.existingPosition?.pnlToken,
    feesUsd: BigNumber.from(0),
    priceImpactUsd: BigNumber.from(0),
  });

  const nextPositionValues = getNextPositionValuesForDecreaseTrade({
    existingPosition: p.existingPosition,
    isClosing,
    sizeDeltaUsd: p.sizeDeltaUsd,
    collateralDeltaUsd,
    showPnlInLeverage: p.showPnlInLeverage,
  });

  const receiveUsd = convertToUsd(
    collateralOutAmount,
    p.collateralToken?.decimals,
    p.collateralToken?.prices?.minPrice
  );

  const receiveTokenAmount = convertToTokenAmount(
    collateralOutAmount,
    p.collateralToken?.decimals,
    p.collateralToken?.prices?.minPrice
  );

  return {
    market: p.market,
    collateralToken: p.collateralToken,
    receiveToken: p.collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    nextPositionValues,
    receiveUsd,
    receiveTokenAmount,
    fees: undefined,
  };
}

export function getNextPositionValuesForDecreaseTrade(p: {
  isClosing: boolean;
  existingPosition?: AggregatedPositionData;
  sizeDeltaUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  showPnlInLeverage?: boolean;
}): NextPositionValues | undefined {
  const nextSizeUsd = p.isClosing
    ? BigNumber.from(0)
    : p.existingPosition?.sizeInUsd.sub(p.sizeDeltaUsd || BigNumber.from(0));

  const nextCollateralUsd = getNextCollateralUsdForDecreaseOrder({
    isClosing: p.isClosing,
    collateralUsd: p.existingPosition?.collateralUsd,
    collateralDeltaUsd: p.collateralDeltaUsd,
    sizeDeltaUsd: p.sizeDeltaUsd,
    pnl: p.existingPosition?.pnl,
  });

  const nextLiqPrice = BigNumber.from(0);

  const nextPnl = BigNumber.from(0);

  const nextLeverage = BigNumber.from(0);

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextLiqPrice,
    nextPnl,
    nextLeverage,
  };
}

export function getIsClosing(p: {
  sizeDeltaUsd?: BigNumber;
  existingPosition?: {
    sizeInUsd: BigNumber;
  };
}) {
  if (!p.existingPosition?.sizeInUsd.gt(0) || !p.sizeDeltaUsd?.gt(0)) return false;

  return p.existingPosition?.sizeInUsd.sub(p.sizeDeltaUsd).lt(DUST_USD);
}

export function getCollateralDeltaUsdForDecreaseTrade(p: {
  isClosing: boolean;
  keepLeverage?: boolean;
  sizeDeltaUsd?: BigNumber;
  existingPosition?: {
    sizeInUsd?: BigNumber;
    collateralUsd?: BigNumber;
  };
}) {
  if (!p.existingPosition?.sizeInUsd?.gt(0) || !p.existingPosition?.collateralUsd?.gt(0)) return BigNumber.from(0);

  if (p.isClosing) return p.existingPosition.collateralUsd;

  if (!p.keepLeverage || !p.sizeDeltaUsd?.gt(0)) return BigNumber.from(0);

  const collateralDeltaUsd = p.sizeDeltaUsd.mul(p.existingPosition.collateralUsd).div(p.existingPosition.sizeInUsd);

  return collateralDeltaUsd;
}

export function getNextCollateralUsdForDecreaseOrder(p: {
  isClosing?: boolean;
  sizeDeltaUsd?: BigNumber;
  collateralUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  pnl?: BigNumber;
}) {
  if (!p.collateralUsd) return undefined;

  if (p.isClosing) return BigNumber.from(0);

  let nextCollateralUsd = p.collateralUsd.sub(p.collateralDeltaUsd || BigNumber.from(0));

  if (p.pnl?.lt(0) && p.sizeDeltaUsd?.gt(0)) {
    nextCollateralUsd = nextCollateralUsd.sub(p.pnl.abs());
  }

  if (nextCollateralUsd.lt(0)) return BigNumber.from(0);

  return nextCollateralUsd;
}

export function getPnlDeltaForDecreaseOrder(position?: Position, indexToken?: TokenData, sizeDeltaUsd?: BigNumber) {
  const pnlPrice = getPriceForPnl(indexToken?.prices, position?.isLong);

  if (!pnlPrice || !indexToken || !position || !sizeDeltaUsd) return undefined;

  const positionValue = convertToUsd(position.sizeInTokens, indexToken.decimals, pnlPrice);
  const totalPnl = positionValue?.sub(position.sizeInUsd).mul(position.isLong ? 1 : -1);

  let sizeDeltaInTokens: BigNumber;

  if (position.sizeInUsd.eq(sizeDeltaUsd)) {
    sizeDeltaInTokens = position.sizeInTokens;
  } else {
    if (position.isLong) {
      // roudUpDivision
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    } else {
      sizeDeltaInTokens = sizeDeltaUsd.mul(position.sizeInTokens).div(position.sizeInUsd);
    }
  }

  const positionPnlUsd = totalPnl?.mul(sizeDeltaInTokens).div(position.sizeInTokens);

  if (!positionPnlUsd || !totalPnl) return undefined;

  return { positionPnlUsd, sizeDeltaInTokens };
}

export function getCollateralOutForDecreaseOrder(p: {
  position?: Position;
  indexToken?: TokenData;
  collateralToken?: TokenData;
  sizeDeltaUsd: BigNumber;
  pnlToken?: TokenData;
  collateralDeltaAmount: BigNumber;
  feesUsd: BigNumber;
  priceImpactUsd: BigNumber;
  allowWithoutPosition?: boolean;
}) {
  let receiveAmount = p.collateralDeltaAmount;

  const pnlData = getPnlDeltaForDecreaseOrder(p.position, p.indexToken, p.sizeDeltaUsd);

  const pnlUsd = pnlData?.positionPnlUsd;

  if (!pnlUsd || !p.collateralToken?.prices || !p.pnlToken) return undefined;

  if (pnlUsd.lt(0)) {
    const deductedPnl = convertToTokenAmount(
      pnlUsd.abs(),
      p.collateralToken.decimals,
      p.collateralToken.prices.minPrice
    )!;

    receiveAmount = receiveAmount.sub(deductedPnl);
  } else {
    const addedPnl = convertToTokenAmount(pnlUsd, p.collateralToken.decimals, p.collateralToken.prices.maxPrice)!;

    //   if (wasSwapped) {
    //     values.outputAmount += swapOutputAmount;
    // } else {
    //     if (params.position.collateralToken() == cache.pnlToken) {
    //         values.outputAmount += pnlAmountForUser;
    //     } else {
    //         // store the pnlAmountForUser separately as it differs from the collateralToken
    //         values.pnlAmountForUser = pnlAmountForUser;
    //     }
    // }

    receiveAmount = receiveAmount.add(addedPnl);
  }

  const feesAmount = convertToTokenAmount(p.feesUsd, p.collateralToken.decimals, p.collateralToken.prices.minPrice)!;

  receiveAmount = receiveAmount.sub(feesAmount);

  const priceImpactAmount = convertToTokenAmount(
    p.priceImpactUsd,
    p.collateralToken.decimals,
    p.collateralToken.prices.minPrice
  )!;

  receiveAmount = receiveAmount.sub(priceImpactAmount);

  if (receiveAmount.lte(0)) {
    return BigNumber.from(0);
  }

  return receiveAmount;
}

export function getShouldSwapPnlToCollateralToken(p: {
  market?: Market;
  collateralTokenAddress?: string;
  isLong?: boolean;
}) {
  if (p.isLong && p.market?.longTokenAddress !== p.collateralTokenAddress) return true;
  if (!p.isLong && p.market?.shortTokenAddress !== p.collateralTokenAddress) return true;

  return false;
}
