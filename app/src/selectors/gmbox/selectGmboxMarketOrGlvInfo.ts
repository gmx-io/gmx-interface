import { selectGlvsAndMarketsInfo } from '@/selectors/glv/selectGlvsAndMarketsInfo';
import { selectGmboxSelectedMarketTokenOrGLvTokenAddress } from './baseSelectors';
import { getByKey } from '@/utils/lib/object';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGmboxMarketOrGlvInfo = createAppStoreSelector(
  [selectGlvsAndMarketsInfo, selectGmboxSelectedMarketTokenOrGLvTokenAddress],
  (glvsAndMarketsInfo, selectedMarketTokenOrGlvTokenAddress) => {
    return getByKey(glvsAndMarketsInfo, selectedMarketTokenOrGlvTokenAddress);
  }
);
