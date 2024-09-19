import { Dispatch, SetStateAction, useEffect } from "react";

import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import { getByKey } from "lib/objects";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";

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
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  selectedMarketAddress: string | undefined;
  shiftAvailableMarkets: GlvOrMarketInfo[];
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
          shiftAvailableMarkets.find((market) => getGlvOrMarketAddress(market) === selectedMarketAddress)
      );

      if (!isSelectedMarketValid) {
        const someAvailableMarket = shiftAvailableMarkets[0];

        if (!someAvailableMarket) {
          return;
        }

        newSelectedMarketAddress = getGlvOrMarketAddress(someAvailableMarket);
        onSelectMarket(newSelectedMarketAddress);
      }

      const isToMarketAvailable = Boolean(toMarketAddress && getByKey(marketsInfoData, toMarketAddress));
      const isToMarketRelated =
        toMarketInfo?.longTokenAddress === selectedMarketInfo?.longTokenAddress &&
        toMarketInfo?.shortTokenAddress === selectedMarketInfo?.shortTokenAddress;
      const isToMarketSameAsSelected = toMarketAddress === newSelectedMarketAddress;
      const isToMarketValid = isToMarketAvailable && isToMarketRelated && !isToMarketSameAsSelected;

      if (toMarketInfo && isGlvInfo(toMarketInfo)) {
        return;
      }

      if (!isToMarketValid) {
        const someAvailableMarket = getShiftAvailableRelatedMarkets({
          marketsInfoData,
          sortedMarketsInfoByIndexToken: shiftAvailableMarkets,
          marketTokenAddress: newSelectedMarketAddress,
        })[0];

        if (!someAvailableMarket) {
          return;
        }

        setToMarketAddress(getGlvOrMarketAddress(someAvailableMarket));
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
      toMarketInfo,
    ]
  );
}
