import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { convertTokenAddress } from '@/utils/legacy/convert';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectChainId } from '../network/baseSelectors';

export const makeSelectWrappedFromAddress = createAppStoreSelectorFactory<
  string | undefined,
  [string | undefined]
>((fromTokenAddress) =>
  createAppStoreSelector([selectChainId], (chainId) => {
    if (!chainId || !fromTokenAddress) return undefined;
    return convertTokenAddress(fromTokenAddress, 'wrapped');
  })
);
