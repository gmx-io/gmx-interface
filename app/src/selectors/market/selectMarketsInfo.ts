import { getGmw348Enabled } from '@/config/featureFlagEnable';
import { getPoolUsdWithoutPnl } from '@/utils/market/getPoolUsdWithoutPnl';

import { selectMarkets } from './baseSelectors';
import { selectMarketsStatus } from './baseSelectors';
import { MarketInfo, MarketsInfo } from '@/selectors/market/types';
import { getByKey } from '@/utils/lib/object';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { selectMarketsState } from './baseSelectors';
import { selectMarketsInfo as selectMarketsInfoNew } from './selectMarketsInfoNew';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';

const selectMarketsInfoOld = createAppStoreSelector(
  [selectMarkets, selectMarketsState, selectMarketsStatus, selectTokensData],
  (markets, states, statuses, tokens): MarketsInfo => {
    const infos: MarketsInfo = {};
    for (const key in markets) {
      const market = markets[key];
      const state = getByKey(states, key);
      const status = getByKey(statuses, key);
      const indexAddr = market.indexTokenAddress?.toBase58();
      const longAddr = market.longTokenAddress?.toBase58();
      const shortAddr = market.shortTokenAddress?.toBase58();
      const indexToken = getByKey(tokens, indexAddr);
      const longToken = getByKey(tokens, longAddr);
      const shortToken = getByKey(tokens, shortAddr);
      if (indexToken && longToken && shortToken && state) {
        const indexName = getMarketIndexName({
          indexToken,
          isSpotOnly: market.isSpotOnly,
          longToken,
          shortToken,
        });
        const poolName = getMarketPoolName({
          longToken: longToken,
          shortToken: shortToken,
        });
        const info = {
          ...market,
          ...state,
          ...status,
          name: `${indexName}[${poolName}]`,
          indexToken,
          longToken: longToken,
          shortToken: shortToken,
        } as MarketInfo;

        infos[key] = {
          ...info,
          poolValueMax: getPoolUsdWithoutPnl(info, true, 'maxPrice').add(
            getPoolUsdWithoutPnl(info, false, 'maxPrice')
          ),
          poolValueMin: getPoolUsdWithoutPnl(info, true, 'minPrice').add(
            getPoolUsdWithoutPnl(info, false, 'minPrice')
          ),
        };
      }
    }
    return infos;
  }
);

export const selectMarketsInfo = getGmw348Enabled()
  ? selectMarketsInfoNew
  : selectMarketsInfoOld;
