import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeOptionsAddresses } from './selectTradeboxTradeOptionsAddresses';

export const selectTradeboxToTokenAddress = createAppStoreSelector(
  [selectTradeboxTradeOptionsAddresses],
  (tradeAddresses) => tradeAddresses.toTokenAddress
);
