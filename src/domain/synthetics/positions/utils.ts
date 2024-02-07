import { UserReferralInfo } from "domain/referrals";
import { MarketInfo, getCappedPoolPnl, getPoolUsdWithoutPnl } from "domain/synthetics/markets";
import { Token, getIsEquivalentTokens } from "domain/tokens";
import { BigNumber, ethers } from "ethers";
import { CHART_PERIODS } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { applyFactor, expandDecimals, formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd, getPositionFee, getPriceImpactForPosition } from "../fees";
import { TokenData, convertToUsd } from "../tokens";
import { PositionInfo } from "./types";
import { Order, OrderType } from "../orders/types";
import { t } from "@lingui/macro";

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}:${marketAddress}:${collateralAddress}:${isLong}`;
}

export function parsePositionKey(positionKey: string) {
  const [account, marketAddress, collateralAddress, isLong] = positionKey.split(":");

  return { account, marketAddress, collateralAddress, isLong: isLong === "true" };
}

export function getEntryPrice(p: { sizeInUsd: BigNumber; sizeInTokens: BigNumber; indexToken: Token }) {
  const { sizeInUsd, sizeInTokens, indexToken } = p;

  if (!sizeInTokens.gt(0)) {
    return undefined;
  }

  return sizeInUsd.div(sizeInTokens).mul(expandDecimals(1, indexToken.decimals));
}

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: BigNumber; markPrice: BigNumber }) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!;
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: BigNumber; pendingBorrowingFeesUsd: BigNumber }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  return pendingBorrowingFeesUsd.add(pendingFundingFeesUsd);
}

export function getPositionNetValue(p: {
  collateralUsd: BigNumber;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  pnl: BigNumber;
  closingFeeUsd: BigNumber;
  uiFeeUsd: BigNumber;
}) {
  const { pnl, closingFeeUsd, collateralUsd, uiFeeUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return collateralUsd.sub(pendingFeesUsd).sub(closingFeeUsd).sub(uiFeeUsd).add(pnl);
}

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  markPrice: BigNumber;
  isLong: boolean;
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p;

  const positionValueUsd = getPositionValueUsd({ indexToken: marketInfo.indexToken, sizeInTokens, markPrice });

  let totalPnl = isLong ? positionValueUsd.sub(sizeInUsd) : sizeInUsd.sub(positionValueUsd);

  if (totalPnl.lte(0)) {
    return totalPnl;
  }

  const poolPnl = isLong ? p.marketInfo.pnlLongMax : p.marketInfo.pnlShortMax;
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    isLong,
    maximize: true,
  });

  const WEI_PRECISION = expandDecimals(1, 18);

  if (!cappedPnl.eq(poolPnl) && cappedPnl.gt(0) && poolPnl.gt(0)) {
    totalPnl = totalPnl.mul(cappedPnl.div(WEI_PRECISION)).div(poolPnl.div(WEI_PRECISION));
  }

  return totalPnl;
}

export function getLiquidationPrice(p: {
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  collateralUsd: BigNumber;
  collateralToken: TokenData;
  marketInfo: MarketInfo;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  minCollateralUsd: BigNumber;
  isLong: boolean;
  useMaxPriceImpact?: boolean;
  userReferralInfo: UserReferralInfo | undefined;
}) {
  const {
    sizeInUsd,
    sizeInTokens,
    collateralUsd,
    collateralAmount,
    marketInfo,
    collateralToken,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    useMaxPriceImpact,
  } = p;

  if (!sizeInUsd.gt(0) || !sizeInTokens.gt(0)) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const closingFeeUsd = getPositionFee(marketInfo, sizeInUsd, false, userReferralInfo).positionFeeUsd;
  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });
  const totalFeesUsd = totalPendingFeesUsd.add(closingFeeUsd);

  const maxNegativePriceImpactUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1);

  let priceImpactDeltaUsd: BigNumber = BigNumber.from(0);

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  } else {
    priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeInUsd.mul(-1), isLong, { fallbackToZero: true });

    if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd.gt(0)) {
      priceImpactDeltaUsd = BigNumber.from(0);
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  let liquidationPrice: BigNumber;

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens.add(collateralAmount);

      if (denominator.eq(0)) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .add(liquidationCollateralUsd)
        .sub(priceImpactDeltaUsd)
        .add(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals));
    } else {
      const denominator = sizeInTokens.sub(collateralAmount);

      if (denominator.eq(0)) {
        return undefined;
      }

      liquidationPrice = sizeInUsd
        .sub(liquidationCollateralUsd)
        .add(priceImpactDeltaUsd)
        .sub(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals));
    }
  } else {
    if (sizeInTokens.eq(0)) {
      return undefined;
    }

    const remainingCollateralUsd = collateralUsd.add(priceImpactDeltaUsd).sub(totalPendingFeesUsd).sub(closingFeeUsd);

    if (isLong) {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .add(sizeInUsd)
        .div(sizeInTokens)
        .mul(expandDecimals(1, indexToken.decimals));
    } else {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .sub(sizeInUsd)
        .div(sizeInTokens.mul(-1))
        .mul(expandDecimals(1, indexToken.decimals));
    }
  }

  if (liquidationPrice.lte(0)) {
    return undefined;
  }

  return liquidationPrice;
}

export function formatLiquidationPrice(liquidationPrice?: BigNumber, opts: { displayDecimals?: number } = {}) {
  if (!liquidationPrice || liquidationPrice.lte(0)) {
    return "NA";
  }

  return formatUsd(liquidationPrice, { ...opts, maxThreshold: "1000000" });
}

export function formatAcceptablePrice(acceptablePrice?: BigNumber, opts: { displayDecimals?: number } = {}) {
  if (acceptablePrice && (acceptablePrice.eq(0) || acceptablePrice.gte(ethers.constants.MaxInt256))) {
    return "NA";
  }

  return formatUsd(acceptablePrice, { ...opts });
}

export function getLeverage(p: {
  sizeInUsd: BigNumber;
  collateralUsd: BigNumber;
  pnl: BigNumber | undefined;
  pendingFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
}) {
  const { pnl, sizeInUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const remainingCollateralUsd = collateralUsd.add(pnl || 0).sub(totalPendingFeesUsd);

  if (remainingCollateralUsd.lte(0)) {
    return undefined;
  }

  return sizeInUsd.mul(BASIS_POINTS_DIVISOR).div(remainingCollateralUsd);
}

export function formatLeverage(leverage?: BigNumber) {
  if (!leverage) return undefined;

  return `${formatAmount(leverage, 4, 2)}x`;
}

export function getEstimatedLiquidationTimeInHours(
  position: PositionInfo,
  minCollateralUsd: BigNumber | undefined
): number | undefined {
  const { marketInfo, isLong, sizeInUsd, isOpening, netValue } = position;

  if (isOpening || !minCollateralUsd) return;

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor);
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }
  const borrowFeePerHour = getBorrowingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const fundingFeePerHour = getFundingFeeRateUsd(marketInfo, isLong, sizeInUsd, CHART_PERIODS["1h"]);
  const maxNegativePriceImpactUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1);
  let priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeInUsd.mul(-1), isLong, {
    fallbackToZero: true,
  });

  if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  }

  // Ignore positive price impact
  if (priceImpactDeltaUsd.gt(0)) {
    priceImpactDeltaUsd = BigNumber.from(0);
  }

  const totalFeesPerHour = borrowFeePerHour.abs().add(fundingFeePerHour.lt(0) ? fundingFeePerHour.abs() : 0);

  if (totalFeesPerHour.eq(0)) return;

  const hours = netValue
    .add(priceImpactDeltaUsd)
    .sub(liquidationCollateralUsd)
    .mul(BASIS_POINTS_DIVISOR)
    .div(totalFeesPerHour);
  return parseFloat(formatAmount(hours, 4, 2));
}

export function formatEstimatedLiquidationTime(hours?: number | undefined) {
  if (!hours) return;
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    return `< 1 hour`;
  }

  if (days > 1000) {
    return "> 1000 days";
  }
  if (hours < 24) {
    const hoursInt = Math.floor(hours);
    return `${hoursInt} ${hoursInt === 1 ? "hour" : "hours"}`;
  }

  return `${days} days`;
}

export function getTriggerNameByOrderType(orderType: OrderType | undefined, abbr = false) {
  const triggerStr = abbr ? t`T` : t`Trigger`;
  const takeProfitStr = abbr ? t`TP` : t`Take-Profit`;
  const stopLossStr = abbr ? t`SL` : t`Stop-Loss`;

  if (orderType === OrderType.LimitDecrease) {
    return takeProfitStr;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return stopLossStr;
  }

  return triggerStr;
}

/*

struct WillPositionCollateralBeSufficientValues {
    uint256 positionSizeInUsd;
    uint256 positionCollateralAmount;
    int256 realizedPnlUsd;
    int256 openInterestDelta;
}

WillPositionCollateralBeSufficientValues memory values = WillPositionCollateralBeSufficientValues(
  params.position.sizeInUsd() - params.order.sizeDeltaUsd(), // positionSizeInUsd
  params.position.collateralAmount() - params.order.initialCollateralDeltaAmount(), // positionCollateralAmount
  cache.estimatedRealizedPnlUsd,  // realizedPnlUsd
  -params.order.sizeDeltaUsd().toInt256() // openInterestDelta
)

function willPositionCollateralBeSufficient(
        DataStore dataStore,
        Market.Props memory market,
        MarketUtils.MarketPrices memory prices,
        address collateralToken,
        bool isLong,
        WillPositionCollateralBeSufficientValues memory values
    ) public view returns (bool, int256) {
        Price.Props memory collateralTokenPrice = MarketUtils.getCachedTokenPrice(
            collateralToken,
            market,
            prices
        );

        int256 remainingCollateralUsd = values.positionCollateralAmount.toInt256() * collateralTokenPrice.min.toInt256();

        // deduct realized pnl if it is negative since this would be paid from
        // the position's collateral
        if (values.realizedPnlUsd < 0) {
            remainingCollateralUsd = remainingCollateralUsd + values.realizedPnlUsd;
        }

        if (remainingCollateralUsd < 0) {
            return (false, remainingCollateralUsd);
        }

        // the min collateral factor will increase as the open interest for a market increases
        // this may lead to previously created limit increase orders not being executable
        //
        // the position's pnl is not factored into the remainingCollateralUsd value, since
        // factoring in a positive pnl may allow the user to manipulate price and bypass this check
        // it may be useful to factor in a negative pnl for this check, this can be added if required
        uint256 minCollateralFactor = MarketUtils.getMinCollateralFactorForOpenInterest(
            dataStore,
            market,
            values.openInterestDelta,
            isLong
        );

        uint256 minCollateralFactorForMarket = MarketUtils.getMinCollateralFactor(dataStore, market.marketToken);
        // use the minCollateralFactor for the market if it is larger
        if (minCollateralFactorForMarket > minCollateralFactor) {
            minCollateralFactor = minCollateralFactorForMarket;
        }

        int256 minCollateralUsdForLeverage = Precision.applyFactor(values.positionSizeInUsd, minCollateralFactor).toInt256();
        bool willBeSufficient = remainingCollateralUsd >= minCollateralUsdForLeverage;

        return (willBeSufficient, remainingCollateralUsd);
    }
*/

export function willPositionCollateralBeSufficient(
  collateralToken: TokenData,
  position: PositionInfo,
  collateralDeltaAmount: BigNumber,
  realizedPnlUsd: BigNumber,
  minCollateralFactor: BigNumber
) {
  const collateralTokenPrice = collateralToken.prices.minPrice; // TODO min or max?
  let remainingCollateralUsd = position.collateralAmount
    .sub(collateralDeltaAmount)
    .mul(collateralTokenPrice)
    .div(expandDecimals(1, collateralToken.decimals));

  if (realizedPnlUsd.lt(0)) {
    remainingCollateralUsd = remainingCollateralUsd.add(realizedPnlUsd);
  }

  if (remainingCollateralUsd.lt(0)) {
    return false;
  }

  const minCollateralUsdForLeverage = applyFactor(position.sizeInUsd, minCollateralFactor);
  console.log("minCollateralUsdForLeverage", formatUsd(minCollateralUsdForLeverage));
  console.log("remainingCollateralUsd", formatUsd(remainingCollateralUsd));
  console.log("diff", formatUsd(remainingCollateralUsd.sub(minCollateralUsdForLeverage)));

  return remainingCollateralUsd.gte(minCollateralUsdForLeverage);
}
