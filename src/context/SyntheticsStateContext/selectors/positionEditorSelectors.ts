// export const useMinCollateralFactorForPosition = (positionKey: string | undefined) => {
//     const selector = useMemo(
//       () => makeSelectMinCollateralFactorForPosition(positionKey, BigNumber.from(0)),
//       [positionKey]
//     );
//     return useSelector(selector);
//   };

import { BigNumber } from "ethers";
import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createEnhancedSelector } from "../utils";
import { selectPositionsInfoData } from "./globalSelectors";
import { getMinCollateralFactorForPosition } from "domain/synthetics/positions";

export const selectPositionEditorEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.editingPositionKey;
export const selectPositionEditorSetEditingPositionKey = (state: SyntheticsState) =>
  state.positionEditor.setEditingPositionKey;

export const selectPositionEditorPosition = createEnhancedSelector((q) => {
  const positionKey = q(selectPositionEditorEditingPositionKey);
  if (!positionKey) return undefined;
  return q((s) => selectPositionsInfoData(s)?.[positionKey]);
});

export const selectPositionEditorMinCollateralFactor = createEnhancedSelector((q) => {
  const position = q(selectPositionEditorPosition);
  if (!position) return undefined;
  return getMinCollateralFactorForPosition(position, BigNumber.from(0));
});
