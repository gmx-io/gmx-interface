import { DEFAULT_CLUSTER } from '@/config/env';
import { SliceCreator } from '@/zustand/types';

interface Network {
  chainId?: string;
  cluster: string;
  setChainId: (chainId?: string) => void;
  syncCluster: (cluster: string) => void;
}

export interface NetworkSlice {
  network: Network;
}

export const createNetworkSlice: SliceCreator<NetworkSlice> = (set, get) => ({
  network: {
    chainId: undefined,
    cluster: DEFAULT_CLUSTER,

    setChainId: (chainId?: string) =>
      set((state) => ({
        network: {
          ...state.network,
          chainId,
        },
      })),

    syncCluster: (cluster) => {
      const current = get().network.cluster;
      if (current != cluster) {
        set((state) => ({
          network: {
            ...state.network,
            cluster,
          },
        }));
      }
    },
  },
});
