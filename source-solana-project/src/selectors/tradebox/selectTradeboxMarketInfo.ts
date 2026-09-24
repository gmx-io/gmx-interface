import { getGmw348Enabled } from '@/config/featureFlagEnable';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getByKey } from '@/utils/lib/object';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTradeboxMarketInfo as selectTradeboxMarketInfoNew } from './selectTradeboxMarketInfoNew';

const selectTradeboxMarketInfoOld = createAppStoreSelector(
  selectMarketsInfo,
  selectTradeboxMarketTokenAddress,
  (marketsInfo, marketTokenAddress) => {
    return getByKey(marketsInfo, marketTokenAddress);
  }
);

export const selectTradeboxMarketInfo = getGmw348Enabled()
  ? selectTradeboxMarketInfoNew
  : selectTradeboxMarketInfoOld;
