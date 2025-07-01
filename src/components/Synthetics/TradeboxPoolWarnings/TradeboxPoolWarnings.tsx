import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect } from "react";

import { BOTANIX, getChainName } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectAccountStats, selectSubaccountState } from "context/SyntheticsStateContext/selectors/globalSelectors";
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
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getFeeItem } from "domain/synthetics/fees";
import { Market, MarketInfo } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition, getMarketPoolName } from "domain/synthetics/markets/utils";
import { formatLeverage } from "domain/synthetics/positions/utils";
import { useChainId } from "lib/chains";
import { formatAmountForMetrics } from "lib/metrics";
import { BN_ZERO, formatPercentage } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getAnalyticsOrderTypeByTradeMode, userAnalytics } from "lib/userAnalytics";
import {
  TradeBoxPoolLowerFeeWarningShownEvent,
  TradeBoxWarningShownEvent,
  TradeBoxWarningSwitchPoolClickEvent,
} from "lib/userAnalytics/types";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/types/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // +0.01%

const SPACE = " ";

export const useTradeboxPoolWarnings = (withActions = true) => {
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
  const isExpressEnabled = useSelector(selectExpressOrdersEnabled);
  const { subaccount } = useSelector(selectSubaccountState);

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

  const tradeMode = useSelector(selectTradeboxTradeMode);
  const tradeType = useSelector(selectTradeboxTradeType);

  const showBotanixSwapWarning =
    chainId === BOTANIX &&
    (fromToken?.assetSymbol === "pBTC" || fromToken?.assetSymbol === "BTC") &&
    (tradeType !== TradeType.Swap || tradeMode !== TradeMode.Market);

  const { setFromTokenAddress, setToTokenAddress, setTradeType, setTradeMode } = useSelector(selectTradeboxState);
  const handleBotanixSwapClick = useCallback(() => {
    setTradeType(TradeType.Swap);
    setTradeMode(TradeMode.Market);
    setFromTokenAddress(fromToken?.address);
    setToTokenAddress(getTokenBySymbol(chainId, "STBTC")?.address);
  }, [chainId, fromToken?.address, setFromTokenAddress, setToTokenAddress, setTradeMode, setTradeType]);

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

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityAndPositionWarning &&
    !showHasInsufficientLiquidityAndNoPositionWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterOpenFeesWarning &&
    !showHasExistingPositionButNotEnoughLiquidityWarning &&
    !showHasExistingOrderButNoLiquidityWarning &&
    !showBotanixSwapWarning
  ) {
    return null;
  }

  const warning: ReactNode[] = [];

  if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingPositionWarning">
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
      </AlertInfoCard>
    );
  }

  if (showHasExistingPositionButNotEnoughLiquidityWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingPositionButNotEnoughLiquidityWarning">
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool, but it lacks
          liquidity for this order.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfoCard key="showHasNoSufficientLiquidityInAnyMarketWarning">
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
      </AlertInfoCard>
    );
  }

  if (showHasInsufficientLiquidityAndNoPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasInsufficientLiquidityAndNoPositionWarning">
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
      </AlertInfoCard>
    );
  }

  if (showHasInsufficientLiquidityAndPositionWarning) {
    warning.push(
      <AlertInfoCard key="showHasInsufficientLiquidityAndPositionWarning">
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
      </AlertInfoCard>
    );
  }

  if (showHasExistingOrderWarning) {
    const address = marketsOptions.collateralWithOrder!.address;

    warning.push(
      <AlertInfoCard key="showHasExistingOrderWarning">
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
      </AlertInfoCard>
    );
  }

  if (showHasExistingOrderButNoLiquidityWarning) {
    warning.push(
      <AlertInfoCard key="showHasExistingOrderWarning">
        <Trans>
          You have an existing limit order in the {getMarketPoolName(marketWithOrder)} market pool but it lacks
          liquidity for this order.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showHasBetterOpenFeesWarning) {
    const onSwitchPoolClick = () => {
      setMarketAddress(minOpenFeesMarket.marketTokenAddress);
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
          Save {formatPercentage(improvedOpenFeesDeltaBps)} in price impact and fees by{" "}
          <WithActon>
            <span className="clickable muted underline" onClick={onSwitchPoolClick}>
              switching to the {getMarketPoolName(minOpenFeesMarket)} pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfoCard>
    );
  }

  if (showBotanixSwapWarning) {
    warning.push(
      <AlertInfoCard key="botanixSwapWarning">
        <Trans>
          <span onClick={handleBotanixSwapClick} className="clickable muted underline">
            Swap {fromToken?.symbol} to STBTC
          </span>{" "}
          to trade with <TokenSymbolWithIcon symbol="STBTC" /> or <TokenSymbolWithIcon symbol="USDC.E" /> as collateral.
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
