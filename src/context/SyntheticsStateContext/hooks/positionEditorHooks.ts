import type { Address } from "viem";

import type { PositionEditorDepositMode } from "domain/synthetics/trade/usePositionEditorState";

import {
  selectPositionEditorAtPriceOpenRequest,
  selectPositionEditorClearAtPriceOpenRequest,
  selectPositionEditorCollateralInputValue,
  selectPositionEditorDepositMode,
  selectPositionEditorEditingPositionKey,
  selectPositionEditorIsCollateralTokenFromGmxAccount,
  selectPositionEditorMinCollateralFactor,
  selectPositionEditorOpenAtPrice,
  selectPositionEditorPosition,
  selectPositionEditorReplacingOrder,
  selectPositionEditorReplacingOrderKey,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSetCollateralInputValue,
  selectPositionEditorSetDepositMode,
  selectPositionEditorSetEditingPositionKey,
  selectPositionEditorSetIsCollateralTokenFromGmxAccount,
  selectPositionEditorSetReplacingOrderKey,
  selectPositionEditorSetSelectedCollateralAddress,
  selectPositionEditorSetTriggerPriceInputValue,
  selectPositionEditorTriggerPrice,
  selectPositionEditorTriggerPriceInputValue,
} from "../selectors/positionEditorSelectors";
import { useSelector } from "../utils";

export const usePositionEditorPositionState = () => {
  const positionKey = useSelector(selectPositionEditorEditingPositionKey);
  const setPositionKey = useSelector(selectPositionEditorSetEditingPositionKey);

  return [positionKey, setPositionKey] as const;
};

export const usePositionEditorPosition = () => useSelector(selectPositionEditorPosition);

export const usePositionEditorMinCollateralFactor = () => useSelector(selectPositionEditorMinCollateralFactor);

export const usePositionEditorSelectedCollateralAddress = (): [Address | undefined, (address: Address) => void] => {
  const selectedCollateralAddress = useSelector(selectPositionEditorSelectedCollateralAddress);
  const setSelectedCollateralAddress = useSelector(selectPositionEditorSetSelectedCollateralAddress);

  return [selectedCollateralAddress, setSelectedCollateralAddress];
};

export const usePositionEditorIsCollateralTokenFromGmxAccount = (): [boolean, (isGmxAccount: boolean) => void] => {
  const isCollateralTokenFromGmxAccount = useSelector(selectPositionEditorIsCollateralTokenFromGmxAccount);
  const setIsCollateralTokenFromGmxAccount = useSelector(selectPositionEditorSetIsCollateralTokenFromGmxAccount);

  return [isCollateralTokenFromGmxAccount, setIsCollateralTokenFromGmxAccount];
};

export const usePositionEditorCollateralInputValue = (): [string, (value: string) => void] => {
  const value = useSelector(selectPositionEditorCollateralInputValue);
  const setValue = useSelector(selectPositionEditorSetCollateralInputValue);

  return [value, setValue];
};

export const usePositionEditorDepositMode = (): [
  PositionEditorDepositMode,
  (depositMode: PositionEditorDepositMode) => void,
] => {
  const depositMode = useSelector(selectPositionEditorDepositMode);
  const setDepositMode = useSelector(selectPositionEditorSetDepositMode);

  return [depositMode, setDepositMode];
};

export const usePositionEditorTriggerPriceInputValue = (): [string, (value: string) => void] => {
  const value = useSelector(selectPositionEditorTriggerPriceInputValue);
  const setValue = useSelector(selectPositionEditorSetTriggerPriceInputValue);

  return [value, setValue];
};

export const usePositionEditorTriggerPrice = () => useSelector(selectPositionEditorTriggerPrice);

export const usePositionEditorReplacingOrderKey = (): [string | undefined, (orderKey: string | undefined) => void] => {
  const replacingOrderKey = useSelector(selectPositionEditorReplacingOrderKey);
  const setReplacingOrderKey = useSelector(selectPositionEditorSetReplacingOrderKey);

  return [replacingOrderKey, setReplacingOrderKey];
};

export const usePositionEditorReplacingOrder = () => useSelector(selectPositionEditorReplacingOrder);

export const usePositionEditorAtPriceOpenRequest = () => {
  const request = useSelector(selectPositionEditorAtPriceOpenRequest);
  const clearRequest = useSelector(selectPositionEditorClearAtPriceOpenRequest);

  return [request, clearRequest] as const;
};

export const usePositionEditorOpenAtPrice = () => useSelector(selectPositionEditorOpenAtPrice);
