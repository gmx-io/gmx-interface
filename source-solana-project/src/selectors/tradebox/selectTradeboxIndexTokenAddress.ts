import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeOptionsAddresses } from './selectTradeboxTradeOptionsAddresses';

export const selectTradeboxIndexTokenAddress = createAppStoreSelector(
  [selectTradeboxTradeOptionsAddresses],
  (tradeAddresses) => tradeAddresses.indexTokenAddress
);
