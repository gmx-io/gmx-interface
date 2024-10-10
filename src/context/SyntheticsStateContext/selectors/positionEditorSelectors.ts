import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import { selectPositionsInfoData } from "./globalSelectors";
import { getIsPositionInfoLoaded, getMinCollateralFactorForPosition } from "domain/synthetics/positions";

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
