import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { convertTokenAddress } from '@/utils/legacy/convert';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectChainId } from '../network/baseSelectors';

export const makeSelectWrappedToAddress = createAppStoreSelectorFactory<
  string | undefined,
  [string | undefined]
>((toTokenAddress) =>
  createAppStoreSelector([selectChainId], (chainId) => {
    if (!chainId || !toTokenAddress) return undefined;
    return convertTokenAddress(toTokenAddress, 'wrapped');
  })
);
