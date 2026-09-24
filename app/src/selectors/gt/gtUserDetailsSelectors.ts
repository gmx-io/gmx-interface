import { BN_ONE, BN_ZERO } from '@/config/constants';
import { RootState } from '@/zustand/useAppStore';

// Gt User Details
export const selectGtUserDetails = (state: RootState) =>
  state.gtState.userDetails;
export const selectGtUserDetailsIsLoading = (state: RootState) =>
  state.gtState.isLoading;
export const selectGtUserDetailsRank = (state: RootState) =>
  state.gtState.userDetails?.rank ?? 0;
export const selectGtUserDetailsLastMintedAt = (state: RootState) =>
  state.gtState.userDetails?.lastMintedAt ?? BN_ZERO;
export const selectGtUserDetailsTotalMintedRaw = (state: RootState) =>
  state.gtState.userDetails?.totalMinted ?? BN_ZERO;
export const selectGtUserDetailsAmount = (state: RootState) =>
  state.gtState.userDetails?.amount ?? BN_ZERO;
export const selectPaidFeeValue = (state: RootState) =>
  state.gtState.userDetails?.paidFeeValue ?? BN_ZERO;
export const selectGtUserDetailsMintedFeeValue = (state: RootState) =>
  state.gtState.userDetails?.mintedFeeValue ?? BN_ZERO; // currently same as paidFeeValue

// Add BN_ONE to totalMintedRaw to account for the minting fee
export const selectGtUserDetailsTotalMinted = (state: RootState) =>
  selectGtUserDetailsTotalMintedRaw(state).add(BN_ONE);
