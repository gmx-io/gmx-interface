import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface StatsState {
  treasuryValue: BN;
  setTreasuryValue: (value: BN) => void;
}

export interface StatsSlice {
  statsState: StatsState;
}

export const createStatsSlice: SliceCreator<StatsSlice> = (set) => ({
  statsState: {
    // Treasury state
    treasuryValue: new BN(0),
    setTreasuryValue: (value) =>
      set((state) => ({
        statsState: {
          ...state.statsState,
          treasuryValue: value,
        },
      })),
  },
});
