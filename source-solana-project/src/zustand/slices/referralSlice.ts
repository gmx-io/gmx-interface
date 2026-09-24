import { ReferralDetails } from '@/hooks/fetchHooks/useReferralDetails';
import { SliceCreator } from '@/zustand/types';

interface ReferralState {
  details: ReferralDetails | null;
  isLoading: boolean;
  isModalOpen: boolean;
  isStyle2: boolean;
  modalInitReferralCode: string;

  setDetails: (details: ReferralDetails | null) => void;
  setIsLoading: (loading: boolean) => void;
  openReferralModal: (initReferralCode?: string, isStyle2?: boolean) => void;
  closeReferralModal: () => void;
}

export interface ReferralSlice {
  referralState: ReferralState;
}

export const createReferralSlice: SliceCreator<ReferralSlice> = (set) => ({
  referralState: {
    details: null,
    isLoading: true,
    isModalOpen: false,
    modalInitReferralCode: '',
    isStyle2: false,

    setDetails: (details) =>
      set((state) => ({
        referralState: {
          ...state.referralState,
          details,
        },
      })),

    setIsLoading: (loading) =>
      set((state) => ({
        referralState: {
          ...state.referralState,
          isLoading: loading,
        },
      })),

    openReferralModal: (initReferralCode = '', isStyle2 = false) =>
      set((state) => ({
        referralState: {
          ...state.referralState,
          isModalOpen: true,
          modalInitReferralCode: initReferralCode,
          isStyle2: isStyle2,
        },
      })),

    closeReferralModal: () =>
      set((state) => ({
        referralState: {
          ...state.referralState,
          isModalOpen: false,
          modalInitReferralCode: '',
        },
      })),
  },
});
