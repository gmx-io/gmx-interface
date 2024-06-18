import { getKeepLeverageKey, getSyntheticsReceiveMoneyTokenKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useState } from "react";
import { PositionInfo } from "../positions";

export enum OrderOption {
  Market = "Market",
  Trigger = "Trigger",
}

export type PositionSellerState = ReturnType<typeof usePositionSellerState>;

export function usePositionSellerState(chainId: number, closingPosition: PositionInfo | undefined) {
  const { savedAllowedSlippage } = useSettings();
  const [orderOption, setOrderOption] = useState<OrderOption>(OrderOption.Market);
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);
  const [defaultTriggerAcceptablePriceImpactBps, setDefaultTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [selectedTriggerAcceptablePriceImpactBps, setSelectedTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReceiveTokenChanged, setIsReceiveTokenChanged] = useState(false);

  const resetPositionSeller = useCallback(() => {
    setOrderOption(OrderOption.Market);
    setTriggerPriceInputValue("");
    setDefaultTriggerAcceptablePriceImpactBps(undefined);
    setSelectedTriggerAcceptablePriceImpactBps(undefined);
    setCloseUsdInputValue("");
    setReceiveTokenAddress("");
    setAllowedSlippage(savedAllowedSlippage);
    setIsSubmitting(false);
    setIsReceiveTokenChanged(false);
  }, [savedAllowedSlippage, setReceiveTokenAddress]);

  const [defaultReceiveToken, setDefaultReceiveToken] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsReceiveMoneyTokenKey(
      chainId,
      closingPosition?.marketInfo.name,
      closingPosition?.isLong ? "long" : "short"
    ),
    undefined
  );

  return {
    orderOption,
    setOrderOption,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    keepLeverage,
    setKeepLeverage,
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedTriggerAcceptablePriceImpactBps,
    closeUsdInputValue,
    setCloseUsdInputValue,
    receiveTokenAddress,
    setReceiveTokenAddress,
    allowedSlippage,
    setAllowedSlippage,
    isSubmitting,
    setIsSubmitting,
    resetPositionSeller,
    isReceiveTokenChanged,
    setIsReceiveTokenChanged,
    defaultReceiveToken,
    setDefaultReceiveToken,
  };
}
