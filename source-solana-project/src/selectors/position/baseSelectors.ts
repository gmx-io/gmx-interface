import { RootState } from '@/zustand/useAppStore';
import { Position } from '@/selectors/position/types';

export const selectPositions = (state: RootState) =>
  state.positionState.positions;
export const selectIsPositionLoading = (state: RootState) =>
  state.positionState.isPositionsLoading;
export const selectSetPositions = (state: RootState) =>
  state.positionState.setPositions;
export const selectSetIsPositionLoading = (state: RootState) =>
  state.positionState.setIsPositionsLoading;
export const selectPositionConstants = (state: RootState) =>
  state.positionState.positionConstants;

export const selectPositionsArray = (state: RootState): Position[] =>
  Object.values(state.positionState.positions);
export const selectPositionKeys = (state: RootState): string[] =>
  Object.keys(state.positionState.positions);
export const selectPositionsCount = (state: RootState): number =>
  Object.keys(state.positionState.positions).length;
export const selectHasPositions = (state: RootState): boolean =>
  selectPositionsCount(state) > 0;
