import { BN_ZERO } from '@/config/constants';
import { RootState } from '@/zustand/useAppStore';

// Gt Bank
export const selectGtBank = (state: RootState) => state.gtState.gtBank;
export const selectGtBankIsLoading = (state: RootState) =>
  state.gtState.isLoading;
export const selectGtBankTreasuryVaultConfig = (state: RootState) =>
  state.gtState.gtBank?.treasuryVaultConfig;
export const selectGtBankGtExchangeVault = (state: RootState) =>
  state.gtState.gtBank?.gtExchangeVault;
export const selectGtBankRemainingConfirmedGtAmount = (state: RootState) =>
  state.gtState.gtBank?.remainingConfirmedGtAmount ?? BN_ZERO;
export const selectGtBankTokenBalances = (state: RootState) =>
  state.gtState.gtBank?.balances;
export const selectGtBnakTokensCount = (state: RootState) =>
  state.gtState.gtBank?.balances?.count ?? 0;
export const selectGtBankBuybackFactor = (state: RootState) =>
  state.gtState.gtBank?.buybackFactor ?? BN_ZERO;
export const selectGtTokenPriceMap = (state: RootState) =>
  state.gtState.tokenPriceMap ?? new Map();
export const selectGtTreasuryValue = (state: RootState) =>
  state.gtState.treasuryValue ?? BN_ZERO;

