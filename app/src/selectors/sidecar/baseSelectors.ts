import { SidecarOrderEntry } from './types';
import { RootState } from '@/zustand/useAppStore';

export const selectSlEntries = (state: RootState): SidecarOrderEntry[] =>
  state.sidecarOrder.sl.entries;
export const selectTpEntries = (state: RootState): SidecarOrderEntry[] =>
  state.sidecarOrder.tp.entries;
export const selectLimitEntries = (state: RootState): SidecarOrderEntry[] =>
  state.sidecarOrder.limit.entries;

export const selectSlEntriesIsUntouched = (state: RootState): boolean =>
  state.sidecarOrder.sl.isUntouched;
export const selectTpEntriesIsUntouched = (state: RootState): boolean =>
  state.sidecarOrder.tp.isUntouched;
export const selectLimitEntriesIsUntouched = (state: RootState): boolean =>
  state.sidecarOrder.limit.isUntouched;

export const selectSetSlEntries = (state: RootState) =>
  state.sidecarOrder.setSlEntries;
export const selectSetTpEntries = (state: RootState) =>
  state.sidecarOrder.setTpEntries;
export const selectSetLimitEntries = (state: RootState) =>
  state.sidecarOrder.setLimitEntries;
export const selectSetIsUntouched = (state: RootState) =>
  state.sidecarOrder.setIsUntouched;
export const selectResetSidecarOrders = (state: RootState) =>
  state.sidecarOrder.reset;

export const selectHasSlEntries = (state: RootState): boolean =>
  state.sidecarOrder.sl.entries.length > 0;
export const selectHasTpEntries = (state: RootState): boolean =>
  state.sidecarOrder.tp.entries.length > 0;
export const selectHasLimitEntries = (state: RootState): boolean =>
  state.sidecarOrder.limit.entries.length > 0;

export const selectHasSidecarOrders = (state: RootState): boolean =>
  selectHasSlEntries(state) ||
  selectHasTpEntries(state) ||
  selectHasLimitEntries(state);

export const selectTotalSidecarOrdersCount = (state: RootState): number =>
  state.sidecarOrder.sl.entries.length +
  state.sidecarOrder.tp.entries.length +
  state.sidecarOrder.limit.entries.length;

export const selectAllSidecarEntries = (
  state: RootState
): SidecarOrderEntry[] => [
  ...state.sidecarOrder.sl.entries,
  ...state.sidecarOrder.tp.entries,
  ...state.sidecarOrder.limit.entries,
];
