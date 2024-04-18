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
import { formatPercentage, formatRatePercentage } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AlertInfo } from "components/AlertInfo/AlertInfo";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = -1; // -0.01%
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
  const maxLiquidityMarket = marketsOptions?.maxLiquidityMarket;
  const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
  const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);
  const isOutPositionLiquidity = isLong
    ? longLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0)
    : shortLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0);
  const marketWithOrder = marketsOptions?.marketWithOrder;
  const minPriceImpactMarket = marketsOptions?.minPriceImpactMarket;
  const minPriceImpactBps = marketsOptions?.minPriceImpactBps;
  const improvedOpenFeeDeltaBps =
    minPriceImpactBps &&
    increaseAmounts?.acceptablePriceDeltaBps &&
    increaseAmounts.acceptablePriceDeltaBps.sub(minPriceImpactBps);
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

  const showHasExistingPositionWarning =
    !hasExistingPosition && marketWithPosition && !isSelectedMarket(marketWithPosition);
  const showHasNoSufficientLiquidityInAnyMarketWarning = isNoSufficientLiquidityInAnyMarket;
  const showHasInsufficientLiquidityWarning =
    isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket);
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
    improvedOpenFeeDeltaBps?.lte(SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS);
  const canShowHasBetterNetFeesWarning =
    bestNetFeeMarket &&
    marketInfo.marketTokenAddress !== bestNetFeeMarket.marketTokenAddress &&
    improvedNetRateAbsDelta?.gte(SHOW_HAS_BETTER_NET_RATE_WARNING_THRESHOLD);
  const showHasBetterExecutionFeesAndNetFeesWarning =
    canShowHasBetterExecutionFeesWarning &&
    canShowHasBetterNetFeesWarning &&
    bestNetFeeMarket.marketTokenAddress === minPriceImpactMarket.marketTokenAddress;
  const showHasBetterExecutionFeesWarning =
    !marketWithPosition &&
    !marketWithOrder &&
    canShowHasBetterExecutionFeesWarning &&
    !showHasBetterExecutionFeesAndNetFeesWarning;
  const showHasBetterNetFeesWarning =
    !marketWithPosition &&
    !marketWithOrder &&
    canShowHasBetterNetFeesWarning &&
    !showHasBetterExecutionFeesAndNetFeesWarning;

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterExecutionFeesWarning &&
    !showHasBetterNetFeesWarning
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

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfo key="showHasNoSufficientLiquidityInAnyMarketWarning" type="warning" compact textColor={textColor}>
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityWarning" type="warning" compact textColor={textColor}>
        <Trans>
          Insufficient liquidity in {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool.
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

  if (showHasBetterExecutionFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterFeesWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You can get a {formatPercentage(improvedOpenFeeDeltaBps)} better open fees in the{" "}
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
      <AlertInfo key="showHasBetterFeesWarning" type="warning" compact textColor={textColor}>
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

  if (showHasBetterExecutionFeesAndNetFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterFeesWarning" type="warning" compact textColor={textColor}>
        <Trans>
          You can get a {formatPercentage(improvedOpenFeeDeltaBps)} better open fees and a{" "}
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
