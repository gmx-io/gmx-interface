import { RootState } from '@/zustand/useAppStore';

export const selectTotalVolume24H = (state: RootState): number => {
  return state.stats?.volume24H ?? 0;
};
