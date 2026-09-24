import { selectPositionSellerIsReceivedTokenChanged } from './baseSelectors';

import { selectPositionSellerDefaultReceiveTokenAddress } from './baseSelectors';

import { getByKey } from '@/utils/lib/object';
import { selectPositionSellerReceiveTokenAddress } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';

export const selectPositionSellerReceiveToken = createAppStoreSelector(
  [
    // selectPositionSellerOrderOption,
    // selectPositionSellerClosingPosition,
    selectTokensData,
    selectPositionSellerIsReceivedTokenChanged,
    selectPositionSellerDefaultReceiveTokenAddress,
    selectPositionSellerReceiveTokenAddress,
  ],
  (
    // orderOption,
    // position,
    tokensData,
    isChanged,
    defaultReceiveTokenAddress,
    receiveTokenAddress
  ) => {
    // const isTrigger = orderOption === OrderOption.Trigger;
    const effectiveReceiveTokenAddress = isChanged
      ? receiveTokenAddress
      : (defaultReceiveTokenAddress ?? receiveTokenAddress);

    return getByKey(tokensData, effectiveReceiveTokenAddress);
  }
);
