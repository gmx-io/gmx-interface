import type { Address } from "viem";

import {
  selectPositionEditorCollateralInputValue,
  selectPositionEditorEditingPositionKey,
  selectPositionEditorMinCollateralFactor,
  selectPositionEditorPosition,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSetCollateralInputValue,
  selectPositionEditorSetEditingPositionKey,
  selectPositionEditorSetSelectedCollateralAddress,
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

export const usePositionEditorCollateralInputValue = (): [string, (value: string) => void] => {
  const value = useSelector(selectPositionEditorCollateralInputValue);
  const setValue = useSelector(selectPositionEditorSetCollateralInputValue);

  return [value, setValue];
};
