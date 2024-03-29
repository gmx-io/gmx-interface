import { Trans, t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { selectTradeboxAvailableMarketsOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Market, MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatPercentage } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useCallback, useMemo } from "react";

export type Props = {
  indexToken?: Token;
  selectedMarket?: MarketInfo;
  hasExistingPosition?: boolean;
  hasExistingOrder?: boolean;
  isOutPositionLiquidity?: boolean;
  currentPriceImpactBps?: BigNumber;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function MarketPoolSelectorRow(p: Props) {
  const {
    selectedMarket,
    indexToken,
    hasExistingOrder,
    hasExistingPosition,
    isOutPositionLiquidity,
    currentPriceImpactBps,
    onSelectMarketAddress,
  } = p;
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const {
    isNoSufficientLiquidityInAnyMarket,
    marketWithOrder,
    marketWithPosition,
    maxLiquidityMarket,
    availableMarkets,
    minPriceImpactMarket,
    minPriceImpactBps,
  } = marketsOptions || {};

  const indexName = indexToken ? getMarketIndexName({ indexToken, isSpotOnly: false }) : undefined;

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return selectedMarket && market.marketTokenAddress === selectedMarket.marketTokenAddress;
    },
    [selectedMarket]
  );

  const message = useMemo(() => {
    if (isNoSufficientLiquidityInAnyMarket) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.</Trans>
          <br />
          <br />
          <Trans>V2 is newly live, and liquidity may be low initially.</Trans>
        </div>
      );
    }

    if (isOutPositionLiquidity && maxLiquidityMarket && !isSelectedMarket(maxLiquidityMarket)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>
            Insufficient liquidity in {selectedMarket ? getMarketPoolName(selectedMarket) : "..."} market pool. <br />
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted "
              onClick={() => onSelectMarketAddress(maxLiquidityMarket!.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(maxLiquidityMarket)} market pool.
            </div>
          </Trans>
        </div>
      );
    }

    if (!hasExistingPosition && marketWithPosition && !isSelectedMarket(marketWithPosition)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>
            You have an existing position in the {getMarketPoolName(marketWithPosition)} market pool.{" "}
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => {
                onSelectMarketAddress(marketWithPosition.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithPosition)} market pool.
            </div>{" "}
          </Trans>
        </div>
      );
    }

    if (!marketWithPosition && !hasExistingOrder && marketWithOrder && !isSelectedMarket(marketWithOrder)) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>
            You have an existing order in the {getMarketPoolName(marketWithOrder)} market pool.{" "}
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => {
                onSelectMarketAddress(marketWithOrder.marketTokenAddress);
              }}
            >
              Switch to {getMarketPoolName(marketWithOrder)} market pool.
            </div>{" "}
          </Trans>
        </div>
      );
    }

    if (
      !marketWithPosition &&
      !marketWithOrder &&
      minPriceImpactMarket &&
      minPriceImpactBps &&
      !isSelectedMarket(minPriceImpactMarket)
    ) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>
            You can get a {formatPercentage(currentPriceImpactBps?.sub(minPriceImpactBps))} better execution price in
            the {getMarketPoolName(minPriceImpactMarket)} market pool.
            <div
              className="MarketSelector-tooltip-row-action clickable underline muted"
              onClick={() => onSelectMarketAddress(minPriceImpactMarket.marketTokenAddress)}
            >
              Switch to {getMarketPoolName(minPriceImpactMarket)} market pool.
            </div>
          </Trans>
        </div>
      );
    }

    return null;
  }, [
    currentPriceImpactBps,
    hasExistingOrder,
    hasExistingPosition,
    indexToken?.symbol,
    isNoSufficientLiquidityInAnyMarket,
    isOutPositionLiquidity,
    isSelectedMarket,
    marketWithOrder,
    marketWithPosition,
    maxLiquidityMarket,
    minPriceImpactBps,
    minPriceImpactMarket,
    onSelectMarketAddress,
    selectedMarket,
  ]);

  return (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={
        message ? (
          <Tooltip
            handle={t`Pool`}
            position="bottom-start"
            className="MarketSelector-tooltip"
            renderContent={() => <div className="MarketSelector-tooltip-content">{message}</div>}
          />
        ) : (
          t`Pool`
        )
      }
      value={
        <>
          <PoolSelector
            label={t`Pool`}
            className="SwapBox-info-dropdown"
            selectedIndexName={indexName}
            selectedMarketAddress={selectedMarket?.marketTokenAddress}
            markets={availableMarkets || EMPTY_ARRAY}
            isSideMenu
            onSelectMarket={(marketInfo) => onSelectMarketAddress(marketInfo.marketTokenAddress)}
          />
        </>
      }
    />
  );
}
