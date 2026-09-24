import { BN_ZERO } from '@/config/constants';
import { RootState } from '@/zustand/useAppStore';

// Gt Global Details
export const selectGtGlobalDetails = (state: RootState) =>
  state.gtState.globalDetails;
export const selectGtGlobalDetailsIsLoading = (state: RootState) =>
  state.gtState.isLoading;
export const selectGtGlobalDetailsDecimals = (state: RootState) =>
  state.gtState.globalDetails?.decimals ?? 0;
export const selectGtGlobalDetailsLastMintedAt = (state: RootState) =>
  state.gtState.globalDetails?.lastMintedAt ?? BN_ZERO;
export const selectGtGlobalDetailsGrowStepAmount = (state: RootState) =>
  state.gtState.globalDetails?.growStepAmount ?? BN_ZERO;
export const selectGtGlobalDetailsMintingCostGrowFactor = (state: RootState) =>
  state.gtState.globalDetails?.mintingCostGrowFactor ?? BN_ZERO;
export const selectGtGlobalDetailsMintingCostRaw = (state: RootState) =>
  state.gtState.globalDetails?.mintingCost ?? BN_ZERO;
export const selectGtGlobalDetailsMaxRank = (state: RootState) =>
  state.gtState.globalDetails?.maxRank ?? BN_ZERO;
export const selectGtGlobalDetailsRanks = (state: RootState) =>
  state.gtState.globalDetails?.ranks ?? [];
export const selectGtGlobalDetailsOrderFeeDiscountFactors = (
  state: RootState
) => state.gtState.globalDetails?.orderFeeDiscountFactors ?? [];
export const selectGtGlobalDetailsReferralRewardFactors = (state: RootState) =>
  state.gtState.globalDetails?.referralRewardFactors ?? [];
export const selectGtGlobalDetailsReserveFactor = (state: RootState) =>
  state.gtState.globalDetails?.reserveFactor ?? BN_ZERO;
export const selectGtGlobalDetailsExchangeTimeWindow = (state: RootState) =>
  state.gtState.globalDetails?.exchangeTimeWindow ?? 0;
export const selectGtGlobalDetailsGrowSteps = (state: RootState) =>
  state.gtState.globalDetails?.growSteps ?? BN_ZERO;
export const selectGtGlobalDetailsSupply = (state: RootState) =>
  state.gtState.globalDetails?.supply ?? BN_ZERO;
export const selectGtGlobalDetailsTotalMintedAmount = (state: RootState) =>
  state.gtState.globalDetails?.totalMintedAmount ?? BN_ZERO;
export const selectGtGlobalDetailsReferralDiscountFactor = (state: RootState) =>
  state.gtState.globalDetails?.referralDiscountFactor ?? BN_ZERO;
export const selectGtGlobalDetailsGtVaultAmount = (state: RootState) =>
  state.gtState.globalDetails?.gtVaultAmount ?? BN_ZERO;
