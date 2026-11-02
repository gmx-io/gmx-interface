import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect } from "react";

import { getChainName } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectAccountStats,
  selectJitLiquidityMap,
  selectSubaccountState,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxFromToken,
  selectTradeboxHasExistingLimitOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxState,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxClosingPool,
  selectTradeboxIsClosedToNewPendingOrders,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxClosingPool";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getFeeItem } from "domain/synthetics/fees";
import { getJitLiquidityInfo } from "domain/synthetics/jit/utils";
import { getMarketClosingState } from "domain/synthetics/markets/closingMarkets";
import { Market, MarketInfo } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForPosition,
  getMarketBaseName,
  getMarketPoolName,
} from "domain/synthetics/markets/utils";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useChainId } from "lib/chains";
import { formatAmountForMetrics } from "lib/metrics";
import { BN_ZERO } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getAnalyticsOrderTypeByTradeMode, userAnalytics } from "lib/userAnalytics";
import {
  TradeBoxPoolLowerFeeWarningShownEvent,
  TradeBoxWarningShownEvent,
  TradeBoxWarningSwitchPoolClickEvent,
} from "lib/userAnalytics/types";
import { TradeMode } from "sdk/utils/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // +0.01%

const useTradeboxPoolWarnings = () => {
  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const { marketInfo, setCollateralAddress, setUserSelectedMarketAddress } = useSelector(selectTradeboxState);
  const accountStats = useSelector(selectAccountStats);
  const fromToken = useSelector(selectTradeboxFromToken);

  const { isLong, isIncrease, isLimit } = useSelector(selectTradeboxTradeFlags);
  const hasExistingPosition = useSelector(selectTradeboxHasExistingPosition);
  const hasExistingOrder = useSelector(selectTradeboxHasExistingLimitOrder);
  const isExpressEnabled = useSelector(selectExpressOrdersEnabled);
  const { subaccount } = useSelector(selectSubaccountState);
  const closingPool = useSelector(selectTradeboxClosingPool);
  const isClosedToNewPendingOrders = useSelector(selectTradeboxIsClosedToNewPendingOrders);

  const jitLiquidityMap = useSelector(selectJitLiquidityMap);

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return marketInfo && market.marketTokenAddress === marketInfo.marketTokenAddress;
    },
    [marketInfo]
  );

  const hasEnoughLiquidity = useCallback(
    (marketInfo: MarketInfo) => {
      const jitInfo = getJitLiquidityInfo(jitLiquidityMap, marketInfo.marketTokenAddress);
      const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true, jitInfo?.maxReservedUsdWithJitLong);
      const shortLiquidity = getAvailableUsdLiquidityForPosition(
        marketInfo,
        false,
        jitInfo?.maxReservedUsdWithJitShort
      );

      return isLong
        ? longLiquidity >= (increaseAmounts?.sizeDeltaUsd || 0)
        : shortLiquidity >= (increaseAmounts?.sizeDeltaUsd || 0);
    },
    [increaseAmounts, isLong, jitLiquidityMap]
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

  const now = Date.now();
  const marketWithPositionClosingState =
    marketWithPosition && getMarketClosingState(chainId, marketWithPosition.marketTokenAddress, now);
  const isMarketWithOrderClosing =
    marketWithOrder !== undefined &&
    getMarketClosingState(chainId, marketWithOrder.marketTokenAddress, now) !== undefined;
  const isMinOpenFeesMarketClosing =
    minOpenFeesMarket !== undefined &&
    getMarketClosingState(chainId, minOpenFeesMarket.marketTokenAddress, now) !== undefined;

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

  const showHasBetterOpenFeesWarning = canShowHasBetterExecutionFeesWarning && !isMinOpenFeesMarketClosing;

  const isFirstOrder = !accountStats || accountStats.closedCount === 0;
  const marketName = marketInfo ? marketInfo.name : "";
  const marketPoolName = marketInfo ? getMarketPoolName(marketInfo) : "";

  const tradeMode = useSelector(selectTradeboxTradeMode);

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
            isExpress1CT: Boolean(subaccount),
            isExpress: isExpressEnabled,
            type: isLong ? "Long" : "Short",
            orderType: getAnalyticsOrderTypeByTradeMode(tradeMode),
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
    isExpressEnabled,
    isFirstOrder,
    isLimit,
    isLong,
    marketName,
    marketPoolName,
    showHasInsufficientLiquidityAndPositionWarning,
    showHasNoSufficientLiquidityInAnyMarketWarning,
    subaccount,
    tradeMode,
  ]);

  useEffect(() => {
    if (showHasBetterOpenFeesWarning) {
      userAnalytics.pushEvent<TradeBoxPoolLowerFeeWarningShownEvent>({
        event: "TradeBoxAction",
        data: {
          action: "LowerFeeInDifferentPoolWarningShown",
          sourcePool: marketPoolName,
          sourcePair: marketName,
          pool: minOpenFeesMarket?.marketTokenAddress,
          pair: minOpenFeesMarket?.name,
        },
      });
    }
  }, [
    showHasBetterOpenFeesWarning,
    marketPoolName,
    marketName,
    minOpenFeesMarket?.name,
    minOpenFeesMarket?.marketTokenAddress,
  ]);

  const showHasExistingOrderButNoLiquidityWarning =
    !hasExistingOrder && marketWithOrder && !hasEnoughLiquidity(marketWithOrder);

  const showClosingPoolWarning = closingPool !== undefined && isClosedToNewPendingOrders;

  if (
    !showClosingPoolWarning &&
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

  if (showClosingPoolWarning) {
    const { poolName, targetMarket } = closingPool;
    const targetPoolName = targetMarket ? getMarketPoolName(targetMarket) : undefined;

    warning.push(
      <AlertInfoCard key="closingPoolPendingOrders" type="error" hideClose>
        {tradeMode === TradeMode.StopMarket ? (
          <Trans>{poolName} pool is closing and isn't taking new stop market orders.</Trans>
        ) : tradeMode === TradeMode.Twap ? (
          <Trans>{poolName} pool is closing and isn't taking new TWAP orders.</Trans>
        ) : (
          <Trans>{poolName} pool is closing and isn't taking new limit orders.</Trans>
        )}
        {targetMarket && (
          <ColorfulButtonLink
            color="blue"
            onClick={() => setUserSelectedMarketAddress(targetMarket.marketTokenAddress)}
          >
            <Trans>Move order to {targetPoolName} pool</Trans>
          </ColorfulButtonLink>
        )}
      </AlertInfoCard>
    );
  }

  if (
    marketWithPositionClosingState?.isClosed &&
    (showHasExistingPositionWarning || showHasExistingPositionButNotEnoughLiquidityWarning)
  ) {
    const token = getMarketBaseName(marketWithPosition);
    const poolName = getMarketPoolName(marketWithPosition);

    warning.push(
      <AlertInfoCard key="showHasExistingPositionInClosedPoolWarning" type="warning" hideClose>
        {isLong ? (
          <Trans>
            Your {token} long is in the {poolName} pool, which is closed to new size. This order opens a separate
            position.
          </Trans>
        ) : (
          <Trans>
            Your {token} short is in the {poolName} pool, which is closed to new size. This order opens a separate
            position.
          </Trans>
        )}
      </AlertInfoCard>
    );
  } else if (showHasExistingPositionWarning && marketWithPositionClosingState) {
    warning.push(
      <AlertInfoCard key="showHasExistingPositionWarning" type="warning" hideClose>
        <Trans>
          Existing position is in {getMarketPoolName(marketWithPosition)} pool. Using the selected pool will create a
          separate position.
        </Trans>
      </AlertInfoCard>
    );
  } else if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingPositionWarning" type="warning" hideClose>
        <Trans>
          Existing position is in {getMarketPoolName(marketWithPosition)} pool. Using the selected pool will create a
          separate position.{" "}
          <ColorfulButtonLink
            color="blue"
            onClick={() => {
              setUserSelectedMarketAddress(marketWithPosition.marketTokenAddress);
              setCollateralAddress(marketsOptions.collateralWithPosition?.address);
            }}
          >
            Switch to {getMarketPoolName(marketWithPosition)} pool
          </ColorfulButtonLink>
        </Trans>
      </AlertInfoCard>
    );
  } else if (showHasExistingPositionButNotEnoughLiquidityWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingPositionButNotEnoughLiquidityWarning" type="warning" hideClose>
        <Trans>
          Existing position is in {getMarketPoolName(marketWithPosition)} pool, but that pool lacks liquidity for this
          order
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfoCard key="showHasNoSufficientLiquidityInAnyMarketWarning" type="error" hideClose>
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD pool</Trans>
      </AlertInfoCard>
    );
  }

  if (showHasInsufficientLiquidityAndNoPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasInsufficientLiquidityAndNoPositionWarning" type="error" hideClose>
        <Trans>
          Insufficient liquidity in {marketInfo ? getMarketPoolName(marketInfo) : "..."} pool. Select a different pool.
        </Trans>
        {hasEnoughLiquidity(minOpenFeesMarket) && !isMinOpenFeesMarketClosing && (
          <ColorfulButtonLink
            color="blue"
            onClick={() => setUserSelectedMarketAddress(minOpenFeesMarket!.marketTokenAddress)}
          >
            <Trans>Switch to {getMarketPoolName(minOpenFeesMarket)} pool</Trans>
          </ColorfulButtonLink>
        )}
      </AlertInfoCard>
    );
  }

  if (showHasInsufficientLiquidityAndPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasInsufficientLiquidityAndPositionWarning" type="error" hideClose>
        <Trans>
          Insufficient liquidity in {marketInfo ? getMarketPoolName(marketInfo) : "..."} pool. Choosing a different pool
          creates a new position.
        </Trans>
        {!isMinOpenFeesMarketClosing && (
          <ColorfulButtonLink
            color="blue"
            onClick={() => setUserSelectedMarketAddress(marketsOptions.minOpenFeesMarket?.marketAddress)}
          >
            <Trans>Switch to {getMarketPoolName(minOpenFeesMarket)} pool</Trans>
          </ColorfulButtonLink>
        )}
      </AlertInfoCard>
    );
  }

  if (showHasExistingOrderWarning && isMarketWithOrderClosing) {
    warning.push(
      <AlertInfoCard key="showHasExistingOrderWarning" type="warning" hideClose>
        <Trans>Existing limit order in {getMarketPoolName(marketWithOrder)} pool</Trans>
      </AlertInfoCard>
    );
  } else if (showHasExistingOrderWarning) {
    const address = marketsOptions.collateralWithOrder!.address;

    warning.push(
      <AlertInfoCard key="showHasExistingOrderWarning" type="warning" hideClose>
        <Trans>
          Existing limit order in {getMarketPoolName(marketWithOrder)} pool
          <ColorfulButtonLink
            color="blue"
            onClick={() => {
              setUserSelectedMarketAddress(marketWithOrder.marketTokenAddress);
              setCollateralAddress(address);
            }}
          >
            Switch to {getMarketPoolName(marketWithOrder)} pool
          </ColorfulButtonLink>
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showHasExistingOrderButNoLiquidityWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingOrderWarning" type="warning" hideClose>
        <Trans>
          Existing limit order is in {getMarketPoolName(marketWithOrder)} pool, but that pool lacks liquidity for this
          order
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showHasBetterOpenFeesWarning) {
    const onSwitchPoolClick = () => {
      setUserSelectedMarketAddress(minOpenFeesMarket.marketTokenAddress);
      userAnalytics.pushEvent<TradeBoxWarningSwitchPoolClickEvent>({
        event: "TradeBoxAction",
        data: {
          action: "WarningSwitchPoolClick",
          sourcePool: marketPoolName,
          sourcePair: marketName,
          pool: minOpenFeesMarket.marketTokenAddress,
          pair: minOpenFeesMarket.name,
        },
      });
    };

    warning.push(
      <AlertInfoCard key="showHasBetterOpenFeesWarning">
        <Trans>
          <span className="cursor-pointer font-medium text-blue-300 underline" onClick={onSwitchPoolClick}>
            Switch to {getMarketPoolName(minOpenFeesMarket)} pool
          </span>{" "}
          for potentially lower price impact
        </Trans>
      </AlertInfoCard>
    );
  }

  return warning;
};

export function TradeboxPoolWarnings() {
  const warnings = useTradeboxPoolWarnings();

  return <>{warnings}</>;
}
