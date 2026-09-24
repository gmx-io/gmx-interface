import { RootState } from '@/zustand/useAppStore';

export const selectGlvs = (state: RootState) => state.glvState.glvs;
export const selectIsGlvLoading = (state: RootState) =>
  state.glvState.isLoading;
export const selectGlvTokenMetadatas = (state: RootState) =>
  state.glvState.glvTokenMetadatas;
export const selectGlvTokenPrices = (state: RootState) =>
  state.glvState.glvTokenPrices;
export const selectSetGlvs = (state: RootState) => state.glvState.setGlvs;
export const selectSetGlvInfo = (state: RootState) => state.glvState.setGlvInfo;
export const selectSetIsGlvLoading = (state: RootState) =>
  state.glvState.setIsLoading;
export const selectSetGlvTokenMetadata = (state: RootState) =>
  state.glvState.setGlvTokenMetadata;
export const selectSetGlvTokenPrice = (state: RootState) =>
  state.glvState.setGlvTokenPrice;
