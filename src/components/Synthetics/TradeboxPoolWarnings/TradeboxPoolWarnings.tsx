import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxFromToken,
  selectTradeboxHasExistingLimitOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxState,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getFeeItem } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition, getMarketPoolName } from "domain/synthetics/markets/utils";
import { BN_ZERO, formatPercentage } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { getChainName } from "config/chains";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useChainId } from "lib/chains";
import { userAnalytics } from "lib/userAnalytics";
import { TradeBoxWarningShownEvent } from "lib/userAnalytics/types";
import { selectAccountStats } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { formatAmountForMetrics } from "lib/metrics";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // +0.01%

const SPACE = " ";

export const useTradeboxPoolWarnings = (
  withActions = true,
  textColor: "text-yellow-500" | "text-slate-100" = "text-slate-100"
) => {
  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const { marketInfo, setCollateralAddress, setMarketAddress } = useSelector(selectTradeboxState);
  const accountStats = useSelector(selectAccountStats);
  const fromToken = useSelector(selectTradeboxFromToken);

  const { isLong, isIncrease, isLimit } = useSelector(selectTradeboxTradeFlags);
  const hasExistingPosition = useSelector(selectTradeboxHasExistingPosition);
  const hasExistingOrder = useSelector(selectTradeboxHasExistingLimitOrder);

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return marketInfo && market.marketTokenAddress === marketInfo.marketTokenAddress;
    },
    [marketInfo]
  );

  const hasEnoughLiquidity = useCallback(
    (marketInfo: MarketInfo) => {
      const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
      const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

      return isLong
        ? longLiquidity >= (increaseAmounts?.sizeDeltaUsd || 0)
        : shortLiquidity >= (increaseAmounts?.sizeDeltaUsd || 0);
    },
    [increaseAmounts, isLong]
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

  const indexToken = marketInfo?.indexToken;
  const marketWithPosition = marketsOptions?.marketWithPosition;
  const collateralWithPosition = marketsOptions?.collateralWithPosition;

  const isNoSufficientLiquidityInAnyMarket = marketsOptions?.isNoSufficientLiquidityInAnyMarket;
  const isNoSufficientLiquidityInMarketWithPosition = marketsOptions?.isNoSufficientLiquidityInMarketWithPosition;
  const minOpenFeesMarket = (marketsOptions?.minOpenFeesMarket?.marketAddress &&
    getByKey(marketsInfoData, marketsOptions?.minOpenFeesMarket.marketAddress)) as MarketInfo | undefined;

  const isOutPositionLiquidity = marketInfo !== undefined && !hasEnoughLiquidity(marketInfo);
  const marketWithOrder = marketsOptions?.marketWithOrder;

  const positionFeeBeforeDiscountBps =
    increaseAmounts &&
    getFeeItem((increaseAmounts.positionFeeUsd + increaseAmounts.feeDiscountUsd) * -1n, increaseAmounts.sizeDeltaUsd)
      ?.bps;

  const improvedOpenFeesDeltaBps =
    increaseAmounts?.acceptablePriceDeltaBps !== undefined
      ? (marketsOptions.minOpenFeesMarket?.openFeesBps ?? BN_ZERO) -
        (positionFeeBeforeDiscountBps ?? BN_ZERO) -
        increaseAmounts.acceptablePriceDeltaBps
      : undefined;

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
    isOutPositionLiquidity && minOpenFeesMarket && !isSelectedMarket(minOpenFeesMarket) && hasExistingPosition;
  const showHasInsufficientLiquidityAndNoPositionWarning =
    isOutPositionLiquidity && minOpenFeesMarket && !isSelectedMarket(minOpenFeesMarket) && !hasExistingPosition;

  const showHasExistingOrderWarning =
    !hasExistingPosition &&
    !marketWithPosition &&
    !hasExistingOrder &&
    marketWithOrder &&
    hasEnoughLiquidity(marketWithOrder) &&
    !isSelectedMarket(marketWithOrder);

  const canShowHasBetterExecutionFeesWarning =
    !showHasExistingPositionWarning &&
    !hasExistingPosition &&
    !hasExistingOrder &&
    !collateralWithPosition &&
    !marketWithOrder &&
    isIncrease &&
    minOpenFeesMarket &&
    !isSelectedMarket(minOpenFeesMarket) &&
    (improvedOpenFeesDeltaBps !== undefined
      ? improvedOpenFeesDeltaBps >= SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS
      : undefined);

  const showHasBetterOpenFeesWarning = canShowHasBetterExecutionFeesWarning;

  const isFirstOrder = !accountStats || accountStats.closedCount === 0;
  const marketName = marketInfo ? marketInfo.name : "";
  const marketPoolName = marketInfo ? getMarketPoolName(marketInfo) : "";

  useEffect(() => {
    if (
      !marketName ||
      !marketPoolName ||
      fromToken?.balance === undefined ||
      increaseAmounts?.initialCollateralAmount === undefined ||
      fromToken.balance < increaseAmounts.initialCollateralAmount
    ) {
      return;
    }

    if (
      showHasNoSufficientLiquidityInAnyMarketWarning ||
      showHasInsufficientLiquidityAndPositionWarning ||
      showHasInsufficientLiquidityAndPositionWarning
    ) {
      userAnalytics.pushEvent<TradeBoxWarningShownEvent>(
        {
          event: "TradeBoxAction",
          data: {
            action: "WarningShown",
            message: "InsufficientLiquidity",
            pair: marketName,
            pool: marketPoolName,
            type: isLong ? "Long" : "Short",
            orderType: isLimit ? "Limit" : "Market",
            sizeDeltaUsd: formatAmountForMetrics(increaseAmounts?.sizeDeltaUsd) ?? 0,
            tradeType: hasExistingPosition ? "IncreaseSize" : "InitialTrade",
            leverage: formatLeverage(increaseAmounts?.estimatedLeverage) || "",
            chain: getChainName(chainId),
            isFirstOrder,
          },
        },
        {
          dedupKey: marketName,
          dedupInterval: 1000 * 60 * 5, // 5m
        }
      );
    }
  }, [
    chainId,
    fromToken?.balance,
    hasExistingPosition,
    increaseAmounts?.estimatedLeverage,
    increaseAmounts?.initialCollateralAmount,
    increaseAmounts?.sizeDeltaUsd,
    isFirstOrder,
    isLimit,
    isLong,
    marketName,
    marketPoolName,
    showHasInsufficientLiquidityAndPositionWarning,
    showHasNoSufficientLiquidityInAnyMarketWarning,
  ]);

  const showHasExistingOrderButNoLiquidityWarning =
    !hasExistingOrder && marketWithOrder && !hasEnoughLiquidity(marketWithOrder);

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityAndPositionWarning &&
    !showHasInsufficientLiquidityAndNoPositionWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterOpenFeesWarning &&
    !showHasExistingPositionButNotEnoughLiquidityWarning &&
    !showHasExistingOrderButNoLiquidityWarning
  ) {
    return null;
  }

  const warning: ReactNode[] = [];

  if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfo key="showHasExistingPositionWarning" type="info" compact textColor={textColor}>
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.
          <WithActon>
            <span
              className="clickable muted underline"
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
      <AlertInfo key="showHasExistingPositionButNotEnoughLiquidityWarning" type="info" compact textColor={textColor}>
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool, but it lacks
          liquidity for this order.
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfo key="showHasNoSufficientLiquidityInAnyMarketWarning" type="info" compact textColor={textColor}>
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndNoPositionWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityAndNoPositionWarning" type="info" compact textColor={textColor}>
        <Trans>
          Insufficient liquidity in the {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool. Select a
          different pool for this market.
          {hasEnoughLiquidity(minOpenFeesMarket) && (
            <WithActon>
              <span
                className="clickable muted underline"
                onClick={() => setMarketAddress(minOpenFeesMarket!.marketTokenAddress)}
              >
                Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
              </span>
              .
            </WithActon>
          )}
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndPositionWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityAndPositionWarning" type="info" compact textColor={textColor}>
        <Trans>
          Insufficient liquidity in the {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool. Select a
          different pool for this market. Choosing a different pool would open a new position different from the
          existing one.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() => setMarketAddress(marketsOptions.minOpenFeesMarket?.marketAddress)}
            >
              Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingOrderWarning) {
    const address = marketsOptions.collateralWithOrder!.address;

    warning.push(
      <AlertInfo key="showHasExistingOrderWarning" type="info" compact textColor={textColor}>
        <Trans>
          You have an existing limit order in the {getMarketPoolName(marketWithOrder)} market pool.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() => {
                setMarketAddress(marketWithOrder.marketTokenAddress);
                setCollateralAddress(address);
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

  if (showHasExistingOrderButNoLiquidityWarning) {
    warning.push(
      <AlertInfo key="showHasExistingOrderWarning" type="info" compact textColor={textColor}>
        <Trans>
          You have an existing limit order in the {getMarketPoolName(marketWithOrder)} market pool but it lacks
          liquidity for this order.
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterOpenFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterOpenFeesWarning" type="info" compact textColor={textColor}>
        <Trans>
          You can get {formatPercentage(improvedOpenFeesDeltaBps)} better open cost in the{" "}
          {getMarketPoolName(minOpenFeesMarket)} market pool.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() => setMarketAddress(minOpenFeesMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
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
