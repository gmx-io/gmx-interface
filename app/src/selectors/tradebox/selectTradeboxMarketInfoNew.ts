import { createMarketInfoSelector } from '../market/makeSelectMarketInfo';
import { selectTradeboxMarketTokenAddress } from './selectTradeboxMarketTokenAddress';

export const selectTradeboxMarketInfo = createMarketInfoSelector(
  selectTradeboxMarketTokenAddress
);
