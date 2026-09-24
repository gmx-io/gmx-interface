import { RootState } from '@/zustand/useAppStore';

export const selectTokens = (state: RootState) => state.tokenState.tokens;
export const selectPrices = (state: RootState) => state.tokenState.prices;
export const selectBalances = (state: RootState) => state.tokenState.balances;

export const selectToken = (state: RootState, tokenAddress: string) =>
  state.tokenState.tokens[tokenAddress];
export const selectPrice = (state: RootState, tokenAddress: string) =>
  state.tokenState.prices[tokenAddress];
export const selectBalance = (state: RootState, tokenAddress: string) =>
  state.tokenState.balances[tokenAddress];
export const selectSetToken = (state: RootState) => state.tokenState.setToken;
export const selectSetPrice = (state: RootState) => state.tokenState.setPrice;
export const selectSetAllPrices = (state: RootState) => state.tokenState.setAllPrices;
export const selectSetAllTokens = (state: RootState) => state.tokenState.setAllTokens;
export const selectSetBalance = (state: RootState) =>
  state.tokenState.setBalance;

export const selectIsPricesInitialized = (state: RootState) =>
  state.tokenState.isPricesInitialized;
export const selectThrottledPricesDelay = (state: RootState) =>
  state.tokenState.throttledPricesDelay;
export const selectThrottledPrices = (state: RootState) =>
  state.tokenState.throttledPrices;
export const selectSetIsPricesInitialized = (state: RootState) =>
  state.tokenState.setIsPricesInitialized;
export const selectSetThrottledPricesDelay = (state: RootState) =>
  state.tokenState.setThrottledPricesDelay;
export const selectSetThrottledPrices = (state: RootState) =>
  state.tokenState.setThrottledPrices;
