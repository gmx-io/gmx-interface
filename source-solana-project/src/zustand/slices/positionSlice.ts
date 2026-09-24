import { MIN_COLLATERAL_USD, MIN_POSITION_SIZE_USD } from '@/config/constants';
import { Position, Positions } from '@/selectors/position/types';
import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface PositionState {
  positionMap: Map<string, string> | Record<string, string>;
  positions: Record<string, Position>;
  isPositionsLoading: boolean;
  positionConstants: {
    minCollateralUsd: BN;
    minPositionSizeUsd: BN;
  };
  positionInfo: Record<string, unknown> | null,
  // setPositionInfo: (positionInfo: Record<string, unknown> | null) => void,
  setPositionInfo: (positionInfo: Object | null) => void,
  setPositionMap: (positionMap: Map<string, string> | Record<string, string>) => void;
  setPositions: (positions: Record<string, Position>) => void;
  setIsPositionsLoading: (loading: boolean) => void;
}

export interface PositionSlice {
  positionState: PositionState;
}

export const createPositionSlice: SliceCreator<PositionSlice> = (set, get) => ({
  positionState: {
    positionMap: new Map(),
    positions: {},
    isPositionsLoading: true,
    positionInfo: null,
    positionConstants: {
      minCollateralUsd: MIN_COLLATERAL_USD,
      minPositionSizeUsd: MIN_POSITION_SIZE_USD,
    },
    setPositionInfo: (positionInfo) => {
      set((state) => ({
        positionState: {
          ...state.positionState as PositionState,
          positionInfo,
        },
      }));
    },
    setPositionMap: (positionMap) => {
      set((state) => ({
        positionState: {
          ...state.positionState,
          positionMap,
        },
      }));
    },

    setPositions: (positions) => {
      set((state) => ({
        positionState: {
          ...state.positionState,
          positions,
        },
      }));
    },

    setIsPositionsLoading: (loading) =>
      set((state) => ({
        positionState: {
          ...state.positionState,
          isPositionsLoading: loading,
        },
      })),
  },
});
