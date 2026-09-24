import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeOptionsAddresses } from './selectTradeboxTradeOptionsAddresses';

export const selectTradeboxMarketTokenAddress = createAppStoreSelector(
  [selectTradeboxTradeOptionsAddresses],
  (tradeAddresses) => tradeAddresses.marketTokenAddress
);
