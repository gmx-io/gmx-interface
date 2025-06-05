import { Dispatch, SetStateAction, useEffect } from "react";

import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvAndGmMarketsInfoData, GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import { getByKey } from "lib/objects";

import { getShiftAvailableRelatedMarkets } from "./getShiftAvailableRelatedMarkets";

export function useUpdateMarkets({
  glvAndMarketsInfoData,
  selectedGlvOrMarketAddress,
  shiftAvailableGlvOrMarkets,
  onSelectGlvOrMarket,
  toMarketAddress,
  toMarketInfo,
  selectedMarketInfo,
  setToMarketAddress,
}: {
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData | undefined;
  selectedGlvOrMarketAddress: string | undefined;
  shiftAvailableGlvOrMarkets: GlvOrMarketInfo[];
  onSelectGlvOrMarket: (glvOrMarketAddress: string) => void;
  toMarketAddress: string | undefined;
  toMarketInfo: MarketInfo | undefined;
  selectedMarketInfo: MarketInfo | undefined;
  setToMarketAddress: Dispatch<SetStateAction<string | undefined>>;
}): void {
  useEffect(
    function updateMarkets() {
      if (!glvAndMarketsInfoData) {
        return;
      }

      let newSelectedGlvOrMarketAddress = selectedGlvOrMarketAddress;

      const isSelectedGlvOrMarketValid = Boolean(
        selectedGlvOrMarketAddress &&
          shiftAvailableGlvOrMarkets.find((market) => getGlvOrMarketAddress(market) === selectedGlvOrMarketAddress)
      );

      if (!isSelectedGlvOrMarketValid) {
        const someAvailableGlvOrMarket = shiftAvailableGlvOrMarkets[0];

        if (!someAvailableGlvOrMarket) {
          return;
        }

        newSelectedGlvOrMarketAddress = getGlvOrMarketAddress(someAvailableGlvOrMarket);
        onSelectGlvOrMarket(newSelectedGlvOrMarketAddress);
      }

      const isToMarketAvailable = Boolean(toMarketAddress && getByKey(glvAndMarketsInfoData, toMarketAddress));
      const isToMarketRelated =
        toMarketInfo?.longTokenAddress === selectedMarketInfo?.longTokenAddress &&
        toMarketInfo?.shortTokenAddress === selectedMarketInfo?.shortTokenAddress;
      const isToMarketSameAsSelected = toMarketAddress === newSelectedGlvOrMarketAddress;
      const isToMarketValid = isToMarketAvailable && isToMarketRelated && !isToMarketSameAsSelected;

      if (toMarketInfo && isGlvInfo(toMarketInfo)) {
        return;
      }

      if (!isToMarketValid) {
        const someAvailableMarket = getShiftAvailableRelatedMarkets({
          marketsInfoData: glvAndMarketsInfoData,
          sortedMarketsInfoByIndexToken: shiftAvailableGlvOrMarkets,
          marketTokenAddress: newSelectedGlvOrMarketAddress,
        })[0];

        if (!someAvailableMarket) {
          return;
        }

        setToMarketAddress(getGlvOrMarketAddress(someAvailableMarket));
      }
    },
    [
      glvAndMarketsInfoData,
      onSelectGlvOrMarket,
      selectedGlvOrMarketAddress,
      selectedMarketInfo?.longTokenAddress,
      selectedMarketInfo?.shortTokenAddress,
      setToMarketAddress,
      shiftAvailableGlvOrMarkets,
      toMarketAddress,
      toMarketInfo,
    ]
  );
}
