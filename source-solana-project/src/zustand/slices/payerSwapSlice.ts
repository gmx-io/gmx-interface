import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface PayerSwapTokens {
  payerSwapList: any[];
  payerSwapTokenInfo: {
    tokenName: string;
    amount: string;
    value: string;
    tokenAddress: string;
    minPrice: BN,
    maxPrice: BN,
    decimals: number,
    defaultMaxTradeMoney: string,
  };
  payerInfo: {
    connected: boolean;
    address: string | null;
    balance: number | null;
  };
  hasPayTokenChange: boolean;
  currentSolBalance: string | null;
  tokenBalancesLoaded: boolean;
  setHasPayTokenChange: (hasPayTokenChange: boolean) => void;
  setTokenBalancesLoaded: (tokenBalancesLoaded: boolean) => void;
  setPayerInfo: (payerInfo: PayerSwapTokens['payerInfo']) => void;
  setPayerSwapList: (payerSwapList: any[]) => void;
  setPayerSwapTokenInfo: (payerSwapTokenInfo: PayerSwapTokens['payerSwapTokenInfo']) => void;
  setCurrentSolBalance: (currentSolBalance: string | null) => void;
}

export interface PayerSwapSlice {
  payerSwapTokens: PayerSwapTokens;
}

export const createPayerSwapSlice: SliceCreator<PayerSwapSlice> = (set, get) => ({
  payerSwapTokens: {
    payerSwapList: [],
    payerSwapTokenInfo: {} as PayerSwapTokens['payerSwapTokenInfo'],
    payerInfo: {
      connected: false,
      address: null,
      balance: null,
    },
    hasPayTokenChange: false,
    currentSolBalance: null,
    tokenBalancesLoaded: false,
    setTokenBalancesLoaded: (tokenBalancesLoaded) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          tokenBalancesLoaded,
        },
      }));
    },
    setCurrentSolBalance: (currentSolBalance) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          currentSolBalance,
        },
      }));
    },
    setHasPayTokenChange: (hasPayTokenChange) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          hasPayTokenChange,
        },
      }));
    },
    setPayerInfo: (payerInfo) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          payerInfo,
        },
      }));
    },
    setPayerSwapList: (payerSwapList) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          payerSwapList,
        },
      }));
    },
    setPayerSwapTokenInfo: (payerSwapTokenInfo) => {
      set((state) => ({
        payerSwapTokens: {
          ...state.payerSwapTokens,
          payerSwapTokenInfo,
        },
      }));
    },
  },
});
