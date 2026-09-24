import { GlvInfoData } from '@/selectors/glv/types';
import { TokenMetadata, TokenMetadatas } from '@/selectors/token/types';
import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';
import isEqual from 'lodash/isEqual';

interface GlvState {
  glvs: Record<string, GlvInfoData>;
  isLoading: boolean;
  glvTokenMetadatas: TokenMetadatas;
  glvTokenPrices: Record<string, BN>;

  setGlvs: (glvs: Record<string, GlvInfoData>) => void;
  setGlvInfo: (glvAddress: string, glvInfo: GlvInfoData) => void;
  setIsLoading: (loading: boolean) => void;
  setGlvTokenMetadata: (
    glvTokenAddress: string,
    metadata: TokenMetadata
  ) => void;
  setGlvTokenPrice: (glvTokenAddress: string, price: BN) => void;
}

export interface GlvSlice {
  glvState: GlvState;
}

export const createGlvSlice: SliceCreator<GlvSlice> = (set, get) => ({
  glvState: {
    glvs: {},
    isLoading: true,
    glvTokenMetadatas: {},
    glvTokenPrices: {},

    setGlvs: (glvs) => {
      const currentGlvs = { ...get().glvState.glvs };

      // Remove old entries
      for (const key in currentGlvs) {
        if (!(key in glvs)) {
          delete currentGlvs[key];
        }
      }

      // Update or add new entries
      for (const key in glvs) {
        const glvInfo = glvs[key];
        const current = currentGlvs[key];
        if (!isEqual(current, glvInfo)) {
          currentGlvs[key] = glvInfo;
        }
      }

      set((state) => ({
        glvState: {
          ...state.glvState,
          glvs: currentGlvs,
        },
      }));
    },

    setGlvInfo: (glvAddress, glvInfo) => {
      const current = get().glvState.glvs[glvAddress];
      if (!isEqual(current, glvInfo)) {
        set((state) => ({
          glvState: {
            ...state.glvState,
            glvs: {
              ...state.glvState.glvs,
              [glvAddress]: glvInfo,
            },
          },
        }));
      }
    },

    setIsLoading: (loading) =>
      set((state) => ({
        glvState: {
          ...state.glvState,
          isLoading: loading,
        },
      })),

    setGlvTokenMetadata: (glvTokenAddress, metadata) => {
      const current = get().glvState.glvTokenMetadatas[glvTokenAddress];
      if (!isEqual(current, metadata)) {
        set((state) => ({
          glvState: {
            ...state.glvState,
            glvTokenMetadatas: {
              ...state.glvState.glvTokenMetadatas,
              [glvTokenAddress]: metadata,
            },
          },
        }));
      }
    },

    setGlvTokenPrice: (glvTokenAddress, price) =>
      set(
        (state) => ({
          glvState: {
            ...state.glvState,
            glvTokenPrices: {
              ...state.glvState.glvTokenPrices,
              [glvTokenAddress]: price,
            },
          },
        }),
        undefined,
        'set-glv-token-price'
      ),
  },
});
