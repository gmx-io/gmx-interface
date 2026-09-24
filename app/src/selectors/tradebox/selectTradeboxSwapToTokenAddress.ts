import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeOptionsAddresses } from './selectTradeboxTradeOptionsAddresses';

export const selectTradeboxSwapToTokenAddress = createAppStoreSelector(
  [selectTradeboxTradeOptionsAddresses],
  (tradeAddresses) => tradeAddresses.swapToTokenAddress
);
