import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";

import {
  useTradeboxAvailableMarketsOptions,
  useTradeboxExistingOrder,
  useTradeboxIncreasePositionAmounts,
  useTradeboxSelectedPosition,
  useTradeboxState,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { Market } from "domain/synthetics/markets/types";
import { getAvailableUsdLiquidityForPosition, getMarketPoolName } from "domain/synthetics/markets/utils";
import { formatPercentage } from "lib/numbers";

import { AlertInfo } from "components/AlertInfo/AlertInfo";

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // 0.01%

export const useTradeboxPoolWarnings = () => {
  const marketsOptions = useTradeboxAvailableMarketsOptions();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const { marketInfo, setMarketAddress } = useTradeboxState();
  const { isLong } = useTradeboxTradeFlags();
  const existingOrder = useTradeboxExistingOrder();
  const selectedPosition = useTradeboxSelectedPosition();
  const hasExistingOrder = Boolean(existingOrder);
  const hasExistingPosition = Boolean(selectedPosition);
  const isSelectedMarket = useCallback(
    (market: Market) => {
      return marketInfo && market.marketTokenAddress === marketInfo.marketTokenAddress;
    },
    [marketInfo]
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

  const betterExecutionPriceBps =
    minPriceImpactBps &&
    increaseAmounts?.acceptablePriceDeltaBps &&
    increaseAmounts.acceptablePriceDeltaBps.sub(minPriceImpactBps);

  const showHasExistingPositionWarning =
    !hasExistingPosition && marketWithPosition && !isSelectedMarket(marketWithPosition);
  const showHasNoSufficientLiquidityInAnyMarketWarning = isNoSufficientLiquidityInAnyMarket;
  const showHasInsufficientLiquidityWarning =
    isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket);
  const showHasExistingOrderWarning =
    !marketWithPosition && !hasExistingOrder && marketWithOrder && !isSelectedMarket(marketWithOrder);
  const showHasBetterFeesWarning =
    !marketWithPosition &&
    !marketWithOrder &&
    minPriceImpactMarket &&
    minPriceImpactBps &&
    !isSelectedMarket(minPriceImpactMarket) &&
    betterExecutionPriceBps?.gt(SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS);

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterFeesWarning
  ) {
    return null;
  }

  const warning: ReactNode[] = [];

  if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfo key="showHasExistingPositionWarning" type="warning" compact>
        <Trans>
          You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.{" "}
          <span
            className="clickable underline muted"
            onClick={() => {
              setMarketAddress(marketWithPosition.marketTokenAddress);
            }}
          >
            Switch to {getMarketPoolName(marketWithPosition)} market pool
          </span>
          .
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfo key="showHasNoSufficientLiquidityInAnyMarketWarning" type="warning" compact>
        <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityWarning) {
    warning.push(
      <AlertInfo key="showHasInsufficientLiquidityWarning" type="warning" compact>
        <Trans>
          Insufficient liquidity in {marketInfo ? getMarketPoolName(marketInfo) : "..."} market pool. <br />
          <span
            className="clickable underline muted "
            onClick={() => setMarketAddress(maxLiquidityMarket!.marketTokenAddress)}
          >
            Switch to {getMarketPoolName(maxLiquidityMarket)} market pool.
          </span>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingOrderWarning) {
    warning.push(
      <AlertInfo key="showHasExistingOrderWarning" type="warning" compact>
        <Trans>
          You have an existing order in the {getMarketPoolName(marketWithOrder)} market pool.{" "}
          <span
            className="clickable underline muted"
            onClick={() => {
              setMarketAddress(marketWithOrder.marketTokenAddress);
            }}
          >
            Switch to {getMarketPoolName(marketWithOrder)} market pool
          </span>
          .
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterFeesWarning) {
    warning.push(
      <AlertInfo key="showHasBetterFeesWarning" type="warning" compact>
        <Trans>
          You can get a {formatPercentage(betterExecutionPriceBps)} better execution price in the{" "}
          {getMarketPoolName(minPriceImpactMarket)} market pool.{" "}
          <span
            className="clickable underline muted"
            onClick={() => setMarketAddress(minPriceImpactMarket.marketTokenAddress)}
          >
            Switch to {getMarketPoolName(minPriceImpactMarket)} market pool
          </span>
          .
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
