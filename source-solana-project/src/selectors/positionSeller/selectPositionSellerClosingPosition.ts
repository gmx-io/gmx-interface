import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getByKey } from '@/utils/lib/object';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectPositionSellerAddress } from './baseSelectors';

export const selectPositionSellerClosingPosition = createAppStoreSelector(
  [selectPositionsInfo, selectPositionSellerAddress],
  (positions, address) => {
    return getByKey(positions, address?.toBase58());
  }
);
