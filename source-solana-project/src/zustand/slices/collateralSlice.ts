import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface CollateralTokens {
  collateralToken: string;
  collateralTokens: any[];
  collateralExchangeRates: Map<string, BN>;
  hasCollateralChange: boolean;
  setCollateralToken: (collateralToken: string) => void;
  setCollateralTokens: (collateralTokens: any[]) => void;
  setCollateralExchangeRates: (collateralExchangeRates: Map<string, BN>) => void;
  setHasCollateralChange: (hasCollateralChange: boolean) => void;
}

export interface CollateralSlice {
  collateralTokens: CollateralTokens;
}

export const createCollateralSlice: SliceCreator<CollateralSlice> = (set, get) => ({
  collateralTokens: {
    collateralToken: '',
    collateralTokens: [],
    collateralExchangeRates: new Map(),
    hasCollateralChange: false,
    setCollateralToken: (collateralToken: string) => {
      set((state) => ({
        collateralTokens: {
          ...state.collateralTokens,
          collateralToken,
        },
      }));
    },
    setCollateralTokens: (collateralTokens: any[]) => {
      set((state) => ({
        collateralTokens: {
          ...state.collateralTokens,
          collateralTokens,
        },
      }));
    },
    setCollateralExchangeRates: (collateralExchangeRates: Map<string, BN>) => {
      set((state) => ({
        collateralTokens: {
          ...state.collateralTokens,
          collateralExchangeRates,
        },
      }));
    },
    setHasCollateralChange: (hasCollateralChange: boolean) => {
      set((state) => ({
        collateralTokens: {
          ...state.collateralTokens,
          hasCollateralChange,
        },
      }));
    },
  },
});
