import { RootState } from '@/zustand/useAppStore';

// Gt Exchange User Account
export const selectGtExchangeUserAccount = (state: RootState) =>
  state.gtState.gtExchangeUserAccount;
export const selectGtExchangeUserAccountIsLoading = (state: RootState) =>
  state.gtState.isLoading;
export const selectGtExchangeUserAccountAmount = (state: RootState) =>
  state.gtState.gtExchangeUserAccount?.amount; // the amount of deposited GT in the user's account
export const selectGtExchangeUserAccountOwner = (state: RootState) =>
  state.gtState.gtExchangeUserAccount?.owner; // the owner of the user's account
export const selectGtExchangeUserAccountVault = (state: RootState) =>
  state.gtState.gtExchangeUserAccount?.vault; // the vault of the user's account
