import { useEffect } from "react";

import type { MarketInfo } from "domain/synthetics/markets/types";

import { isGlv } from "@/domain/synthetics/markets/glv";
import { usePrevious } from "@/lib/usePrevious";
import { Operation } from "../types";

/**
 * Redirect to the Buy tab when user picks GLV market to shift
 */
export function useRedirectToBuyOnShiftToGlv({
  toMarketAddress,
  toMarketInfo,
  selectedMarketInfo,
  onSelectMarket,
  onSelectGlvGmMarket,
  setFirstTokenAddressForDeposit,
  onSetOperation,
}: {
  toMarketAddress: string | undefined;
  toMarketInfo: MarketInfo | undefined;
  selectedMarketInfo: MarketInfo | undefined;

  onSelectMarket: (marketAddress: string) => void;
  onSelectGlvGmMarket?: (marketAddress: string) => void;
  setFirstTokenAddressForDeposit: (address: string) => void;
  onSetOperation: (operation: Operation) => void;
}) {
  const previousToMarketAddress = usePrevious(toMarketAddress);
  useEffect(() => {
    if (
      toMarketAddress &&
      toMarketAddress !== previousToMarketAddress &&
      isGlv(toMarketInfo) &&
      selectedMarketInfo?.marketTokenAddress
    ) {
      onSelectMarket(toMarketAddress);
      setFirstTokenAddressForDeposit(selectedMarketInfo.marketTokenAddress);
      onSetOperation(Operation.Deposit);
      onSelectGlvGmMarket?.(selectedMarketInfo.marketTokenAddress);
    }
  }, [
    toMarketAddress,
    toMarketInfo,
    selectedMarketInfo,
    previousToMarketAddress,
    setFirstTokenAddressForDeposit,
    onSelectGlvGmMarket,
    onSetOperation,
    onSelectMarket,
  ]);
}
