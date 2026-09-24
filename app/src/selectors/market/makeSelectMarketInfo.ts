import {
  createAppStoreSelector,
  createAppStoreSelectorFactory,
  RootState,
} from '@/zustand/useAppStore';

import { getGmw348Enabled } from '@/config/featureFlagEnable';
import { getByKey } from '@/utils/lib/object';
import {
  selectMarkets,
  selectMarketsState,
  selectMarketsStatus,
} from './baseSelectors';
import { MarketInfo } from './types';
import {
  computeMarketInfoForKey,
  MarketDepsSnapshot,
} from './selectMarketsInfoUtils';
import { selectTokensData } from '../token/selectTokensData';
import { selectMarketsInfo } from './selectMarketsInfo';

export function createMarketInfoSelector(
  selectMarketKey: (state: RootState) => string | undefined
) {
  return createAppStoreSelector(
    [
      selectMarketKey,
      (state) => {
        const key = selectMarketKey(state);
        return key ? getByKey(selectMarkets(state), key) : undefined;
      },
      (state) => {
        const key = selectMarketKey(state);
        return key ? getByKey(selectMarketsState(state), key) : undefined;
      },
      (state) => {
        const key = selectMarketKey(state);
        return key ? getByKey(selectMarketsStatus(state), key) : undefined;
      },
      (state) => {
        const key = selectMarketKey(state);
        if (!key) return undefined;
        const market = getByKey(selectMarkets(state), key);
        if (!market) return undefined;
        return getByKey(
          selectTokensData(state),
          market.indexTokenAddress.toBase58()
        );
      },
      (state) => {
        const key = selectMarketKey(state);
        if (!key) return undefined;
        const market = getByKey(selectMarkets(state), key);
        if (!market) return undefined;
        return getByKey(
          selectTokensData(state),
          market.longTokenAddress.toBase58()
        );
      },
      (state) => {
        const key = selectMarketKey(state);
        if (!key) return undefined;
        const market = getByKey(selectMarkets(state), key);
        if (!market) return undefined;
        return getByKey(
          selectTokensData(state),
          market.shortTokenAddress.toBase58()
        );
      },
    ],
    (
      key,
      market,
      state,
      status,
      indexToken,
      longToken,
      shortToken
    ): MarketInfo | undefined => {
      if (!key || !market || !state || !indexToken || !longToken || !shortToken) {
        return undefined;
      }

      const deps: MarketDepsSnapshot = {
        market,
        state,
        status,
        indexToken,
        longToken,
        shortToken,
      };

      return computeMarketInfoForKey(key, deps);
    }
  );
}

export const makeSelectMarketInfo = createAppStoreSelectorFactory<
  MarketInfo | undefined,
  [string | undefined]
>((marketTokenAddress) => {
  if (getGmw348Enabled()) {
    return createMarketInfoSelector(() => marketTokenAddress);
  }

  return createAppStoreSelector([selectMarketsInfo], (marketsInfo) =>
    marketTokenAddress ? getByKey(marketsInfo, marketTokenAddress) : undefined
  );
});
