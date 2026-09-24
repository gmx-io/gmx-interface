import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectTradeboxTradeOptionsAddresses } from './selectTradeboxTradeOptionsAddresses';

export const selectTradeboxReceiveTokenAddress = createAppStoreSelector(
  [selectTradeboxTradeOptionsAddresses],
  (tradeAddresses) => tradeAddresses.receiveTokenAddress
);
