import { RootState } from '@/zustand/useAppStore';

export const selectChainId = (state: RootState) => state.network.chainId;
export const selectCluster = (state: RootState) => state.network.cluster;
export const selectSetChainId = (state: RootState) => state.network.setChainId;
export const selectSyncCluster = (state: RootState) =>
  state.network.syncCluster;
