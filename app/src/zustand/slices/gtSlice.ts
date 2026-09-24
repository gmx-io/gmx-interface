import {
  GtBank,
  GtExchangeAccount,
  GtExchangeVault,
  GtGlobalDetails,
  GtUserDetails,
} from '@/selectors/gt/types';
import { SliceCreator } from '@/zustand/types';

interface GtState {
  userDetails: GtUserDetails | null;
  globalDetails: GtGlobalDetails | null;
  gtBank: GtBank | null;
  gtExchangeVault: GtExchangeVault | null;
  gtExchangeUserAccount: GtExchangeAccount | null;
  isLoading: boolean;
  depositInputValue: string;
  tokenPriceMap: Map<string, any>;
  treasuryValue: BN | null;

  setTreasuryValue: (treasuryValue: BN | null) => void;
  setTokenPriceMap: (tokenPriceMap: Map<string, any>) => void;
  setUserDetails: (details: GtUserDetails | null) => void;
  setGlobalDetails: (globalDetails: GtGlobalDetails | null) => void;
  setGtBank: (gtBank: GtBank | null) => void;
  setGtExchangeVault: (gtExchangeVault: GtExchangeVault | null) => void;
  setGtExchangeUserAccount: (account: GtExchangeAccount | null) => void;
  setIsLoading: (loading: boolean) => void;
  setDepositInputValue: (value: string) => void;
}

export interface GtSlice {
  gtState: GtState;
}

export const createGtSlice: SliceCreator<GtSlice> = (set) => ({
  gtState: {
    userDetails: null,
    globalDetails: null,
    gtBank: null,
    gtExchangeVault: null,
    gtExchangeUserAccount: null,
    isLoading: true,
    depositInputValue: '',
    tokenPriceMap: new Map(),
    treasuryValue: null,

    setTreasuryValue: (treasuryValue) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          treasuryValue,
        },
      })),

    setTokenPriceMap: (tokenPriceMap) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          tokenPriceMap,
        },
      })),

    setUserDetails: (userDetails) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          userDetails,
        },
      })),

    setGlobalDetails: (globalDetails) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          globalDetails,
        },
      })),

    setGtBank: (gtBank) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          gtBank,
        },
      })),

    setGtExchangeVault: (gtExchangeVault) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          gtExchangeVault,
        },
      })),

    setGtExchangeUserAccount: (gtExchangeUserAccount) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          gtExchangeUserAccount,
        },
      })),

    setIsLoading: (loading) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          isLoading: loading,
        },
      })),

    setDepositInputValue: (value) =>
      set((state) => ({
        gtState: {
          ...state.gtState,
          depositInputValue: value,
        },
      })),
  },
});
