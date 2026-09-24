import { selectMarkets } from './baseSelectors';
import { selectMarketsStatus } from './baseSelectors';
import { selectMarketsState } from './baseSelectors';
import { computeMarketsInfo } from './selectMarketsInfoUtils';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';

export const selectMarketsInfo = createAppStoreSelector(
  [selectMarkets, selectMarketsState, selectMarketsStatus, selectTokensData],
  (markets, states, statuses, tokens) =>
    computeMarketsInfo(markets, states, statuses, tokens)
);
