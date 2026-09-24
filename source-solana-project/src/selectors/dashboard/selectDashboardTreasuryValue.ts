import { RootState } from '@/zustand/useAppStore';

export const selectDashboardTreasuryValue = (state: RootState) =>
  state.statsState.treasuryValue;
