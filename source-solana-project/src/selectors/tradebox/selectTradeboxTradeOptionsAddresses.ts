import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getTradeAddresses } from '@/utils/tradebox/getTradeAddresses';
import { selectTradeboxTradeOptions } from './baseSelectors';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxTradeOptionsAddresses = createAppStoreSelector(
  [selectTradeboxTradeFlags, selectTradeboxTradeOptions],
  (tradeFlags, tradeOptions) => getTradeAddresses(tradeFlags, tradeOptions)
);
