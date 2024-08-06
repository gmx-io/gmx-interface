import { Dispatch, SetStateAction, useEffect } from "react";

import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets/types";
import { getByKey } from "lib/objects";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useUpdateMarkets({
  marketsInfoData,
  selectedMarketAddress,
  shiftAvailableMarkets,
  onSelectMarket,
  toMarketAddress,
  toMarketInfo,
  selectedMarketInfo,
  setToMarketAddress,
}: {
  marketsInfoData: MarketsInfoData | undefined;
  selectedMarketAddress: string | undefined;
  shiftAvailableMarkets: MarketInfo[];
  onSelectMarket: (marketAddress: string) => void;
  toMarketAddress: string | undefined;
  toMarketInfo: MarketInfo | undefined;
  selectedMarketInfo: MarketInfo | undefined;
  setToMarketAddress: Dispatch<SetStateAction<string | undefined>>;
}): void {
  useEffect(
    function updateMarkets() {
      if (!marketsInfoData) {
        return;
      }

      let newSelectedMarketAddress = selectedMarketAddress;

      const isSelectedMarketValid = Boolean(
        selectedMarketAddress &&
          getByKey(marketsInfoData, selectedMarketAddress) &&
          shiftAvailableMarkets.find((market) => market.marketTokenAddress === selectedMarketAddress)
      );

      if (!isSelectedMarketValid) {
        const firstMarketInfo = shiftAvailableMarkets[0];
        if (!firstMarketInfo) {
          return;
        }
        onSelectMarket(firstMarketInfo.marketTokenAddress);
        newSelectedMarketAddress = firstMarketInfo.marketTokenAddress;
      }

      const isToMarketAvailable = Boolean(toMarketAddress && getByKey(marketsInfoData, toMarketAddress));
      const isToMarketRelated =
        toMarketInfo?.longTokenAddress === selectedMarketInfo?.longTokenAddress &&
        toMarketInfo?.shortTokenAddress === selectedMarketInfo?.shortTokenAddress;
      const isToMarketValid = isToMarketAvailable && isToMarketRelated;

      if (!isToMarketValid) {
        const someAvailableMarket = getShiftAvailableRelatedMarkets({
          marketsInfoData,
          sortedMarketsInfoByIndexToken: shiftAvailableMarkets,
          marketTokenAddress: newSelectedMarketAddress,
        })[0];

        if (!someAvailableMarket) {
          return;
        }

        setToMarketAddress(someAvailableMarket.marketTokenAddress);
      }
    },
    [
      marketsInfoData,
      onSelectMarket,
      selectedMarketAddress,
      selectedMarketInfo?.longTokenAddress,
      selectedMarketInfo?.shortTokenAddress,
      setToMarketAddress,
      shiftAvailableMarkets,
      toMarketAddress,
      toMarketInfo?.longTokenAddress,
      toMarketInfo?.shortTokenAddress,
    ]
  );
}