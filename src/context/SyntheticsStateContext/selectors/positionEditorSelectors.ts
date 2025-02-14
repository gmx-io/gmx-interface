import type { Address } from "viem";

import {
  getIsPositionInfoLoaded,
  getMinCollateralFactorForPosition,
  parsePositionKey,
} from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { parseValue } from "lib/numbers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import { selectPositionsInfoData, selectTokensData } from "./globalSelectors";

export const selectPositionEditorEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.editingPositionKey;
export const selectPositionEditorSetEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.setEditingPositionKey;

export const selectPositionEditorPosition = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);
  if (!positionKey) return undefined;
  return q((s) => selectPositionsInfoData(s)?.[positionKey]);
});

export const selectPositionEditorMinCollateralFactor = createSelector((q) => {
  const position = q(selectPositionEditorPosition);

  if (!getIsPositionInfoLoaded(position)) return undefined;

  return getMinCollateralFactorForPosition(position, 0n);
});

export const selectPositionEditorCollateralInputValue = (state: SyntheticsState) =>
  state.positionEditor.collateralInputValue;
export const selectPositionEditorSetCollateralInputValue = (state: SyntheticsState) =>
  state.positionEditor.setCollateralInputValue;

const selectPositionEditorSelectedCollateralAddressMap = (state: SyntheticsState) =>
  state.positionEditor.selectedCollateralAddressMap;
export const selectPositionEditorSetSelectedCollateralAddress = (state: SyntheticsState) =>
  state.positionEditor.setSelectedCollateralAddress;

export const selectPositionEditorSelectedCollateralAddress = createSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);

  if (!positionKey) {
    return;
  }

  const positionCollateralAddress = parsePositionKey(positionKey).collateralAddress as Address;

  const savedAddress = q((s) => selectPositionEditorSelectedCollateralAddressMap(s)?.[positionCollateralAddress]);

  if (!savedAddress) {
    return positionCollateralAddress;
  }

  return savedAddress;
});

export const selectPositionEditorSelectedCollateralToken = createSelector((q) => {
  const tokenAddress = q(selectPositionEditorSelectedCollateralAddress);

  if (!tokenAddress) return;

  const token = q((s) => selectTokensData(s)?.[tokenAddress]);

  return token;
});

export const selectPositionEditorCollateralInputAmountAndUsd = createSelector((q) => {
  const collateralInputValue = q(selectPositionEditorCollateralInputValue);
  const collateralToken = q(selectPositionEditorSelectedCollateralToken);

  const collateralPrice = collateralToken?.prices.minPrice;
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  return {
    collateralDeltaAmount,
    collateralDeltaUsd,
  };
});
