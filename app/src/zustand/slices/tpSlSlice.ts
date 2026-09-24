import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface TpSlTokens {
  tpPrice: BN | null;
  slPrice: BN | null;
  tpGainMoney: BN | null;
  slLossMoney: BN | null;
  tpsl: {
    tpGainMoney: string;
    slLossMoney: string;
    tpGainRate: string;
    slLossRate: string;
  };
  enableTpsl: boolean,
  setTpPrice: (tpPrice: BN | null) => void,
  setSlPrice: (slPrice: BN | null) => void,
  setEnableTpsl: (enableTpsl: boolean) => void,
  setTpGainMoney: (tpGainMoney: BN | null) => void,
  setSlLossMoney: (slLossMoney: BN | null) => void,
  setTpsl: (tpsl: TpSlTokens['tpsl']) => void,
}

export interface TpSlSlice {
  tpSlTokens: TpSlTokens;
}

export const createTpSlSlice: SliceCreator<TpSlSlice> = (set, get) => ({
  tpSlTokens: {
    tpPrice: null,
    slPrice: null,
    tpGainMoney: null,
    slLossMoney: null,
    enableTpsl: false,
    tpsl: {
      tpGainMoney: '',
      slLossMoney: '',
      tpGainRate: '',
      slLossRate: '',
    },
    setEnableTpsl: (enableTpsl: boolean) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            enableTpsl,
          },
        }),
        false,
        'tpSl/setEnableTpsl'
      ),
    setTpPrice: (tpPrice: BN | null) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            tpPrice,
          },
        }),
        false,
        'tpSl/setTpPrice'
      ),
    setSlPrice: (slPrice: BN | null) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            slPrice,
          },
        }),
        false,
        'tpSl/setSlPrice'
      ),
    setTpGainMoney: (tpGainMoney: BN | null) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            tpGainMoney,
          },
        }),
        false,
        'tpSl/setTpGainMoney'
      ),
    setSlLossMoney: (slLossMoney: BN | null) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            slLossMoney,
          },
        }),
        false,
        'tpSl/setSlLossMoney'
      ),
    setTpsl: (tpsl: TpSlTokens['tpsl']) =>
      set(
        (state) => ({
          tpSlTokens: {
            ...state.tpSlTokens,
            tpsl,
          },
        }),
        false,
        'tpSl/setTpsl'
      ),
  },
});
