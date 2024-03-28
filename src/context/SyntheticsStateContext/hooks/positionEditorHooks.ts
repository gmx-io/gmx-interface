import {
  selectPositionEditorEditingPositionKey,
  selectPositionEditorMinCollateralFactor,
  selectPositionEditorPosition,
  selectPositionEditorSetEditingPositionKey,
} from "../selectors/positionEditorSelectors";
import { useSelector } from "../utils";

export const usePositionEditorPositionState = () => {
  const positionKey = useSelector(selectPositionEditorEditingPositionKey);
  const setPositionKey = useSelector(selectPositionEditorSetEditingPositionKey);

  return [positionKey, setPositionKey] as const;
};

export const usePositionEditorPosition = () => useSelector(selectPositionEditorPosition);

export const usePositionEditorMinCollateralFactor = () => useSelector(selectPositionEditorMinCollateralFactor);
