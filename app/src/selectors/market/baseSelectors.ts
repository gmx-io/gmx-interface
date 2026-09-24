import { RootState } from '@/zustand/useAppStore';

export const selectIsMarketLoading = (state: RootState) =>
  state.markets.isMarketLoading;
export const selectIsMarketTokenLoading = (state: RootState) =>
  state.markets.isMarketTokenLoading;
export const selectMarkets = (state: RootState) => state.markets.marketsOnChain;
export const selectMarketsState = (state: RootState) =>
  state.markets.marketsState;
export const selectMarketsStatus = (state: RootState) =>
  state.markets.marketsStatus;
export const selectMarketTokenMetadatas = (state: RootState) =>
  state.markets.marketTokenMetadatas;
export const selectMarketTokenPrices = (state: RootState) =>
  state.markets.marketTokenPrices;
export const selectSetIsMarketLoading = (state: RootState) =>
  state.markets.setIsMarketLoading;
export const selectSetIsMarketTokenLoading = (state: RootState) =>
  state.markets.setIsMarketTokenLoading;
export const selectSetMarket = (state: RootState) => state.markets.setMarket;
export const selectSetMarketState = (state: RootState) =>
  state.markets.setMarketState;
export const selectSetMarketStatus = (state: RootState) =>
  state.markets.setMarketStatus;
export const selectSetAllMarketStatuses = (state: RootState) =>
  state.markets.setAllMarketStatuses;
export const selectSetMarketTokenMetadata = (state: RootState) =>
  state.markets.setMarketTokenMetadata;
export const selectSetMarketTokenPrice = (state: RootState) =>
  state.markets.setMarketTokenPrice;
