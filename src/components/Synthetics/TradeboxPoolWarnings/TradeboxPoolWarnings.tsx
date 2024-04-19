import { Trans } from "@lingui/macro";
import { BigNumber } from "ethers";
import { ReactNode, useCallback } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxAvailableMarketsOptions,
  useTradeboxExistingOrder,
  useTradeboxIncreasePositionAmounts,
  useTradeboxSelectedPosition,
  useTradeboxState,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectStatsMarketsInfoDataToIndexTokenStatsMap } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Market } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition, getMarketPoolName } from "domain/synthetics/markets/utils";
import { BN_ZERO, formatPercentage, formatRatePercentage } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { getFeeItem } from "domain/synthetics/fees/utils";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // +0.01%
const SHOW_HAS_BETTER_NET_RATE_WARNING_THRESHOLD = BigNumber.from(10).pow(25); // +0.001%

const SPACE = " ";

export const useTradeboxPoolWarnings = (
  withActions = true,
  textColor: "text-warning" | "text-gray" = "text-warning"
) => {
  const marketsInfoData = useMarketsInfoData();
  const marketsOptions = useTradeboxAvailableMarketsOptions();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const { marketInfo, setMarketAddress, setCollateralAddress } = useTradeboxState();
  const { isLong } = useTradeboxTradeFlags();
  const existingOrder = useTradeboxExistingOrder();
  const selectedPosition = useTradeboxSelectedPosition();
  const hasExistingOrder = Boolean(existingOrder);
  const hasExistingPosition = Boolean(selectedPosition);
  const marketStatsMap = useSelector(selectStatsMarketsInfoDataToIndexTokenStatsMap);

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return marketInfo && market.marketTokenAddress === marketInfo.marketTokenAddress;
    },
    [marketInfo]
  );

  const WithActon = useCallback(
    ({ children }: { children: ReactNode }) =>
      withActions ? (
        <>
          {SPACE}
          {children}
        </>
      ) : null,
    [withActions]
  );

  if (!marketInfo) {
    return null;
  }

  const indexToken = marketInfo.indexToken;
  const marketWithPosition = marketsOptions?.marketWithPosition;
  const isNoSufficientLiquidityInAnyMarket = marketsOptions?.isNoSufficientLiquidityInAnyMarket;
  const isNoSufficientLiquidityInMarketWithPosition = marketsOptions?.isNoSufficientLiquidityInMarketWithPosition;
  const maxLiquidityMarket = marketsOptions?.maxLiquidityMarket;
  const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
  const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);
  const isOutPositionLiquidity = isLong
    ? longLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0)
    : shortLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0);
  const marketWithOrder = marketsOptions?.marketWithOrder;
  const minPriceImpactMarket = marketsOptions?.minPriceImpactMarket;
  const minPriceImpactBps = marketsOptions?.minPriceImpactBps;
  const minPriceImpactPositionFeeBps = marketsOptions?.minPriceImpactPositionFeeBps;
  const positionFeeBeforeDiscountBps =
    increaseAmounts &&
    getFeeItem(increaseAmounts.positionFeeUsd.add(increaseAmounts.feeDiscountUsd).mul(-1), increaseAmounts.sizeDeltaUsd)
      ?.bps;

  const improvedOpenFeesDeltaBps =
    minPriceImpactBps &&
    increaseAmounts?.acceptablePriceDeltaBps &&
    increaseAmounts.acceptablePriceDeltaBps
      .add(positionFeeBeforeDiscountBps || BN_ZERO)
      .sub(minPriceImpactBps.add(minPriceImpactPositionFeeBps || BN_ZERO))
      .abs();

  const indexTokenStat = marketStatsMap.indexMap[marketInfo.indexTokenAddress];
  const currentMarketStat = indexTokenStat?.marketsStats.find(
    (stat) => stat.marketInfo.marketTokenAddress === marketInfo?.marketTokenAddress
  );
  const bestMarketStat = indexTokenStat?.marketsStats.find(
    (stat) =>
      stat.marketInfo.marketTokenAddress ===
      (isLong ? indexTokenStat.bestNetFeeLongMarketAddress : indexTokenStat.bestNetFeeShortMarketAddress)
  );
  const bestNetFee = isLong ? indexTokenStat?.bestNetFeeLong : indexTokenStat?.bestNetFeeShort;
  const currentNetFee = isLong ? currentMarketStat?.netFeeLong : currentMarketStat?.netFeeShort;
  const improvedNetRateAbsDelta =
    bestMarketStat && currentMarketStat && bestNetFee && currentNetFee && bestNetFee.sub(currentNetFee).abs();
  const bestNetFeeMarket = getByKey(
    marketsInfoData,
    isLong ? indexTokenStat?.bestNetFeeLongMarketAddress : indexTokenStat?.bestNetFeeShortMarketAddress
  );

  const showHasExistingPositionButNotEnoughLiquidityWarning =
    !hasExistingPosition &&
    marketWithPosition &&
    !isSelectedMarket(marketWithPosition) &&
    isNoSufficientLiquidityInMarketWithPosition;
  const showHasExistingPositionWarning =
    !showHasExistingPositionButNotEnoughLiquidityWarning &&
    !hasExistingPosition &&
    marketWithPosition &&
    !isSelectedMarket(marketWithPosition);

  const showHasNoSufficientLiquidityInAnyMarketWarning = isNoSufficientLiquidityInAnyMarket;
  const showHasInsufficientLiquidityAndPositionWarning =
    isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket) && hasExistingPosition;
  const showHasInsufficientLiquidityAndNoPositionWarning =
    isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket) && !hasExistingPosition;

  const showHasExistingOrderWarning =
    !hasExistingPosition &&
    !marketWithPosition &&
    !hasExistingOrder &&
    marketWithOrder &&
    !isSelectedMarket(marketWithOrder);

  const canShowHasBetterExecutionFeesWarning =
    minPriceImpactMarket &&
    minPriceImpactBps &&
    !isSelectedMarket(minPriceImpactMarket) &&
    improvedOpenFeesDeltaBps?.gte(SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS);
  const canShowHasBetterNetFeesWarning =
    bestNetFeeMarket &&
    marketInfo.marketTokenAddress !== bestNetFeeMarket.marketTokenAddress &&
    improvedNetRateAbsDelta?.gte(SHOW_HAS_BETTER_NET_RATE_WARNING_THRESHOLD);
  const showHasBetterOpenFeesAndNetFeesWarning =
    canShowHasBetterExecutionFeesWarning &&
    canShowHasBetterNetFeesWarning &&
    bestNetFeeMarket.marketTokenAddress === minPriceImpactMarket.marketTokenAddress;
  const showHasBetterOpenFeesWarning = canShowHasBetterExecutionFeesWarning && !showHasBetterOpenFeesAndNetFeesWarning;
  const showHasBetterNetFeesWarning = canShowHasBetterNetFeesWarning && !showHasBetterOpenFeesAndNetFeesWarning;

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityAndPositionWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterOpenFeesWarning &&
    !showHasBetterNetFeesWarning &&
    !showHasBetterOpenFeesAndNetFeesWarning &&
    !showHasExistingPositionButNotEnoughLiquidityWarning
  ) {
    return null;
  }

  const warning: ReactNode[] = [];

  if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfo key="showHasExistingPositionWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => {
                setMarketAddress(marketWithPosition.marketTokenAddress);
                setCollateralAddress(marketsOptions.collateralWithPosition?.address);
              }}
            >
              Switch to {getMarketPoolName(marketWithPosition)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingPositionButNotEnoughLiquidityWarning) {
    warning.push(
      <AlertInfo key="showHasExistingPositionButNotEnoughLiquidityWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool, but it lacks
          liquidity for this order.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => {
                setMarketAddress(marketWithPosition.marketTokenAddress);
                setCollateralAddress(marketsOptions.collateralWithPosition?.address);
              }}
            >
              Switch anyway to {getMarketPoolName(marketWithPosition)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfo key="showHasNoSufficientLiquidityInAnyMarketWarning" type="warning" compact textColor={textColor}>
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndNoPositionWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityAndNoPositionWarning" type="warning" compact textColor={textColor}>
        <Trans>
          Insufficient liquidity in the {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool. Select a
          different pool for this market.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => setMarketAddress(maxLiquidityMarket!.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(maxLiquidityMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndPositionWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityAndPositionWarning" type="warning" compact textColor={textColor}>
        <Trans>
          Insufficient liquidity in the {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool. Select a
          different pool for this market. Choosing a different pool would open a new position different from the
          existing one.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => setMarketAddress(maxLiquidityMarket!.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(maxLiquidityMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingOrderWarning) {
    warning.push(
      <AlertInfo key="showHasExistingOrderWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You have an existing order in the {getMarketPoolName(marketWithOrder)} market pool.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => {
                setMarketAddress(marketWithOrder.marketTokenAddress);
                setCollateralAddress(marketsOptions.collateralWithOrder?.address);
              }}
            >
              Switch to {getMarketPoolName(marketWithOrder)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterOpenFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterOpenFeesWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You can get {formatPercentage(improvedOpenFeesDeltaBps)} better open fees in the{" "}
          {getMarketPoolName(minPriceImpactMarket)} market pool.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => setMarketAddress(minPriceImpactMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(minPriceImpactMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterNetFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterNetFeesWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You can get a {formatRatePercentage(improvedNetRateAbsDelta, { signed: false })} / 1h better net rate in the{" "}
          {getMarketPoolName(bestNetFeeMarket)} market pool.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => setMarketAddress(bestNetFeeMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(bestNetFeeMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterOpenFeesAndNetFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterOpenFeesAndNetFeesWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You can get {formatPercentage(improvedOpenFeesDeltaBps)} better open fees and a{" "}
          {formatRatePercentage(improvedNetRateAbsDelta, { signed: false })} / 1h better net rate in the{" "}
          {getMarketPoolName(minPriceImpactMarket)} market pool.
          <WithActon>
            <span
              className="clickable underline muted"
              onClick={() => setMarketAddress(minPriceImpactMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(minPriceImpactMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  return warning;
};

export function TradeboxPoolWarnings() {
  const warnings = useTradeboxPoolWarnings();

  return <>{warnings}</>;
}
