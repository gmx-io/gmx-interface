import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@/config/constants';

export const selectSwapPayToken = {
  amount: "",
  decimals: 0,
  lpAmount: "",
  maxPrice: "",
  minPrice: "",
  percentChange24h: "",
  tokenAddress: "",
  tokenName: "",
  value: "",
  payAmount: BN_ZERO,
  paySizeInUsd: BN_ZERO,
  limitAmount: BN_ZERO
};

export const selectSwapReceiveToken = {
  amount: "",
  decimals: 0,
  lpAmount: "",
  maxPrice: "",
  minPrice: "",
  percentChange24h: "",
  tokenAddress: "",
  tokenName: "",
  value: "",
  receiveAmount: BN_ZERO,
  receiveSizeInUsd: BN_ZERO,
  limitAmount: BN_ZERO
}

interface PayerSwapItem {
  tokenAddress: string;
  tokenName: string;
  amount: string;
  value: string;
  lpAmount?: string;
  maxPrice?: string;
  minPrice?: string;
  percentChange24h?: string;
  decimals?: number;
  payAmount?: BN,
  paySizeInUsd?: BN,
  limitAmount?: BN
}

interface Swap {
  selectSwapPayToken: PayerSwapItem;
  selectSwapReceiveToken: PayerSwapItem;
  swapMark: string;
  swapFinished: boolean;
  swapFeeRate: string;
  setSwapFeeRate: (swapFeeRate: string) => void;
  setSelectSwapPayToken: (selectSwapPayToken: PayerSwapItem) => void;
  setSelectSwapReceiveToken: (selectSwapReceiveToken: PayerSwapItem) => void;
  setSwapMark: (swapMark: string) => void;
  setSwapFinished: (swapFinished: boolean) => void;
}

export interface SwapSlice {
  swap: Swap;
}

export const createSwapSlice: SliceCreator<SwapSlice> = (set, get) => ({
  swap: {
    swapFeeRate: '0.000%',
    selectSwapPayToken: selectSwapPayToken,
    selectSwapReceiveToken: selectSwapReceiveToken,
    swapMark: '',
    swapFinished: false,
    setSwapFeeRate: (swapFeeRate: string) => {
      set((state) => ({
        swap: {
          ...state.swap,
          swapFeeRate,
        },
      }));
    },
    setSwapFinished: (swapFinished: boolean) => {
      set((state) => ({
        swap: {
          ...state.swap,
          swapFinished,
        },
      }));
    },
    setSwapMark: (swapMark: string) => {
      set((state) => ({
        swap: {
          ...state.swap,
          swapMark,
        },
      }));
    },
    setSelectSwapPayToken: (selectSwapPayToken: PayerSwapItem) => {
      set((state) => ({
        swap: {
          ...state.swap,
          selectSwapPayToken,
        },
      }));
    },
    setSelectSwapReceiveToken: (selectSwapReceiveToken: PayerSwapItem) => {
      set((state) => ({
        swap: {
          ...state.swap,
          selectSwapReceiveToken,
        },
      }));
    },
  }
});
