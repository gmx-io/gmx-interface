import { Trans } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
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
import { useCallback } from "react";

export function TradeboxPoolWarnings() {
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
    !isSelectedMarket(minPriceImpactMarket);

  return (
    <>
      {showHasExistingPositionWarning && (
        <AlertInfo type="warning" compact>
          <Trans>
            You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.{" "}
            <span
              className="clickable underline muted"
              onClick={() => {
                setMarketAddress(marketWithPosition.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithPosition)} market pool.
            </span>
          </Trans>
        </AlertInfo>
      )}
      {showHasNoSufficientLiquidityInAnyMarketWarning && (
        <AlertInfo type="warning" compact>
          <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
          <br />
          <br />
          <Trans>V2 is newly live, and liquidity may be low initially.</Trans>
        </AlertInfo>
      )}
      {showHasInsufficientLiquidityWarning && (
        <AlertInfo type="warning" compact>
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
      )}
      {showHasExistingOrderWarning && (
        <AlertInfo type="warning" compact>
          <Trans>
            You have an existing order in the {getMarketPoolName(marketWithOrder)} market pool.{" "}
            <span
              className="clickable underline muted"
              onClick={() => {
                setMarketAddress(marketWithOrder.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithOrder)} market pool.
            </span>
          </Trans>
        </AlertInfo>
      )}
      {showHasBetterFeesWarning && (
        <Trans>
          You can get a {formatPercentage(increaseAmounts?.acceptablePriceDeltaBps?.sub(minPriceImpactBps))} better
          execution price in the {getMarketPoolName(minPriceImpactMarket)} market pool.
          <span
            className="clickable underline muted"
            onClick={() => setMarketAddress(minPriceImpactMarket.marketTokenAddress)}
          >
            Switch to {getMarketPoolName(minPriceImpactMarket)} market pool.
          </span>
        </Trans>
      )}
    </>
  );
}
