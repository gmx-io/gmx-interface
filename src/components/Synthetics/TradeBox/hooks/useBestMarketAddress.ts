import { useCallback, useEffect } from "react";

import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxExistingOrder,
  selectTradeboxRelatedMarketsStats,
  selectTradeboxSelectedPosition,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { Token } from "domain/tokens";

import { useTradeboxChanges } from "./useTradeboxChanges";

export type Props = {
  indexToken?: Token;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export function useBestMarketAddress() {
  const { setMarketAddress, isMarketAddressChangedManually, setIsMarketAddressChangedManually } =
    useSelector(selectTradeboxState);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const { relatedMarketStats, relatedMarketsPositionStats } = useSelector(selectTradeboxRelatedMarketsStats);

  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const existingOrder = useSelector(selectTradeboxExistingOrder);

  const hasExistingPosition = Boolean(selectedPosition);
  const hasExistingOrder = Boolean(existingOrder);

  const tradeboxChanges = useTradeboxChanges();

  const setBestMarketAddress = useCallback(
    (marketAddress: string | undefined) => {
      setMarketAddress(marketAddress);
      setIsMarketAddressChangedManually(true);
    },
    [setIsMarketAddressChangedManually, setMarketAddress]
  );

  useEffect(() => {
    if (tradeboxChanges.toTokenAddress) {
      setIsMarketAddressChangedManually(false);
    }
  }, [tradeboxChanges.toTokenAddress, setIsMarketAddressChangedManually]);

  useEffect(() => {
    if (hasExistingPosition || hasExistingOrder || isMarketAddressChangedManually || relatedMarketStats.length <= 1) {
      return;
    }

    if (!(tradeboxChanges.leverage || !tradeboxChanges.fromTokenInputValue || tradeboxChanges.toTokenInputValue)) {
      return;
    }

    const sortedByMarketOpenFeeWithSameCollateral = [...relatedMarketStats]
      .filter((market) => {
        return (
          market.marketInfo.longTokenAddress === collateralTokenAddress ||
          market.marketInfo.shortTokenAddress === collateralTokenAddress
        );
      })
      .sort((a, b) => {
        const openFeesA = relatedMarketsPositionStats[a.marketInfo.marketTokenAddress].openFees;
        const openFeesB = relatedMarketsPositionStats[b.marketInfo.marketTokenAddress].openFees;

        if (openFeesA === undefined || openFeesB === undefined) {
          return 0;
        }

        /** Open fees are negative, so we need to sort them in descending order */
        return openFeesA - openFeesB > 0 ? -1 : 1;
      });

    const bestMarket = sortedByMarketOpenFeeWithSameCollateral[0];

    if (!bestMarket) {
      return;
    }

    setMarketAddress(bestMarket.marketInfo.marketTokenAddress);
  }, [
    tradeboxChanges,
    hasExistingPosition,
    hasExistingOrder,
    isMarketAddressChangedManually,
    relatedMarketStats,
    relatedMarketsPositionStats,
    collateralTokenAddress,
    setMarketAddress,
  ]);

  return {
    setMarketAddress: setBestMarketAddress,
  };
}
