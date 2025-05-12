import { useCallback, useMemo, useState } from "react";

import { getKeepLeverageKey, getSyntheticsReceiveMoneyTokenKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { TradeMode } from "sdk/types/trade";

import { PositionInfo } from "../positions";
import { TwapDuration } from "./twap/types";
import { DEFAULT_TWAP_DURATION, DEFAULT_TWAP_NUMBER_OF_PARTS } from "./twap/utils";

export enum OrderOption {
  Market = "Market",
  Trigger = "Trigger",
  Twap = "TWAP",
}

export const ORDER_OPTION_TO_TRADE_MODE: Record<OrderOption, TradeMode> = {
  [OrderOption.Market]: TradeMode.Market,
  [OrderOption.Trigger]: TradeMode.Trigger,
  [OrderOption.Twap]: TradeMode.Twap,
};

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
  const [duration, setDuration] = useState<TwapDuration>(DEFAULT_TWAP_DURATION);
  const [numberOfParts, setNumberOfParts] = useState<number>(DEFAULT_TWAP_NUMBER_OF_PARTS);

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

  const closingPositionKey = useMemo(() => {
    return getSyntheticsReceiveMoneyTokenKey(
      chainId,
      closingPosition?.market.name,
      closingPosition?.isLong ? "long" : "short",
      closingPosition?.collateralTokenAddress
    );
  }, [chainId, closingPosition]);

  const [defaultReceiveToken, setDefaultReceiveToken] = useLocalStorageSerializeKey<string | undefined>(
    closingPositionKey,
    undefined
  );

  const handleSetOrderOption = useCallback((option: OrderOption) => {
    setOrderOption(option);
    setTriggerPriceInputValue("");
  }, []);

  return {
    orderOption,
    handleSetOrderOption,
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
    duration,
    setDuration,
    numberOfParts,
    setNumberOfParts,
  };
}
