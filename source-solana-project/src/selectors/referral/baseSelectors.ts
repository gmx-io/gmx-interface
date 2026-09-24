import { RootState } from '@/zustand/useAppStore';

export const selectReferralDetails = (state: RootState) =>
  state.referralState.details;
export const selectReferralIsLoading = (state: RootState) =>
  state.referralState.isLoading;

export const selectReferrer = (state: RootState) =>
  state.referralState.details?.referrer ?? null;
export const selectReferralCode = (state: RootState) =>
  state.referralState.details?.referralCode ?? null;
export const selectRefereeCount = (state: RootState) =>
  state.referralState.details?.refereeCount ?? 0;

export const selectHasReferralCode = (state: RootState) =>
  state.referralState.details?.hasSetReferralCode ?? false;
export const selectHasReferrer = (state: RootState) =>
  state.referralState.details?.hasReferrer ?? false;
export const selectReferralModalIsOpen = (state: RootState) =>
  state.referralState.isModalOpen;
export const selectReferralModalIsStyle2 = (state: RootState) =>
  state.referralState.isStyle2;
export const selectReferralModalInitCode = (state: RootState) =>
  state.referralState.modalInitReferralCode;
export const selectOpenReferralModal = (state: RootState) =>
  state.referralState.openReferralModal;
export const selectCloseReferralModal = (state: RootState) =>
  state.referralState.closeReferralModal;
