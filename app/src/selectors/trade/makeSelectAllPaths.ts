import { SwapRoute } from '@/selectors/trade/types';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import {
  createAppStoreSelector,
  createAppStoreSelectorFactory,
} from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { makeSelectWrappedFromAddress } from './makeSelectWrappedFromAddress';
import { makeSelectWrappedToAddress } from './makeSelectWrappedToAddress';

export const makeSelectAllPaths = createAppStoreSelectorFactory<
  SwapRoute[] | undefined,
  [string | undefined, string | undefined]
>((fromTokenAddress, toTokenAddress) =>
  createAppStoreSelector(
    [
      selectMarketsInfo,
      selectSwapGraph,
      makeSelectWrappedFromAddress(fromTokenAddress),
      makeSelectWrappedToAddress(toTokenAddress),
    ],
    (marketsInfo, graph, wrappedFromAddress, wrappedToAddress) => {
      if (!marketsInfo) return undefined;

      const isWrap =
        isNativeToken(fromTokenAddress) && isWrappedNativeToken(toTokenAddress);
      const isUnwrap =
        isWrappedNativeToken(fromTokenAddress) && isNativeToken(toTokenAddress);
      const isSameToken = isSameTokenAddress(fromTokenAddress, toTokenAddress);

      if (
        !graph ||
        !wrappedFromAddress ||
        !wrappedToAddress ||
        isWrap ||
        isUnwrap ||
        isSameToken
      ) {
        return undefined;
      }

      return findAllPaths(
        marketsInfo,
        graph,
        wrappedFromAddress,
        wrappedToAddress
      )?.sort((a, b) => (b.liquidity.gt(a.liquidity) ? 1 : -1));
    }
  )
);
