import { BN_ZERO } from '@/config/constants';

import { RootState } from '@/zustand/useAppStore';

// Gt Exchange Vault
export const selectGtExchangeVault = (state: RootState) =>
  state.gtState.gtExchangeVault;
export const selectGtExchangeVaultIsLoading = (state: RootState) =>
  state.gtState.isLoading;
export const selectGtExchangeVaultTs = (state: RootState) =>
  state.gtState.gtExchangeVault?.ts ?? BN_ZERO; // the exact timestamp of the vault creation
export const selectGtExchangeVaultTimeWindow = (state: RootState) =>
  state.gtState.gtExchangeVault?.timeWindow ?? BN_ZERO; // the time window of the vault
export const selectGtExchangeVaultAmount = (state: RootState) =>
  state.gtState.gtExchangeVault?.amount ?? BN_ZERO; // the amount of GT in the vault
