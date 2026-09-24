import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface TradeboxNew {
  Fees: BN;
  priorityFees: BN,
  slippage: number;
  btnMessage: string;
  graphObj: null;
  payTokenNum: BN,
  leverage: string;
  sizeNumber: BN;
  marketDirection: 'Long' | 'Short' | 'Swap';
  marketType: 'Limit' | 'Market';
  limitPrice: BN | null;
  scale: BN,
  tradeMoney: BN,
  simulationData: any;
  // leverageMarks: [1, 5, 10, 25, 50, 75, 100],
  leverageHighTip: boolean,
  btnDisabled: boolean,
  impactFeesTip: boolean,
  bestImpactFees: string;
  simulationImpactFees: string;
  vipFeeValue: BN;
  referralFeeValue: BN;
  isForbiddenTrade: boolean;
  vobSizeUsd: BN | null;
  setVobSizeUsd: (vobSizeUsd: BN | null) => void;
  setForbiddenTrade: (isForbiddenTrade: boolean) => void;
  setVipFeeValue: (vipFeeValue: BN) => void;
  setReferralFeeValue: (referralFeeValue: BN) => void;
  setPriorityFees: (priorityFees: BN) => void;
  setSlippage: (slippage: number) => void;
  setBtnDisabled: (btnDisabled: boolean) => void;
  setBtnMessage: (btnMessage: string) => void;
  setLeverageHighTip: (leverageHighTip: boolean) => void;
  setImpactFeesTip: (impactFeesTip: boolean) => void;
  // setLeverageMarks: (leverageMarks: any[]) => void;
  setSimulationData: (simulationData: any) => void;
  setLimitPrice: (price: BN | null) => void;
  setPayTokenNum: (payTokenNum: BN) => void;
  setTradeMoney: (tradeMoney: BN) => void;
  setLeverage: (leverage: string) => void;
  setScale: (scale: BN) => void;
  setMarketDirection: (marketDirection: 'Long' | 'Short' | 'Swap') => void;
  setMarketType: (marketType: 'Market' | 'Limit') => void;
  setSizeNumber: (sizeNumber: BN) => void;
  setGraphObj: (graphObj: any) => void;
  setFees: (Fees: BN) => void;
}
export interface TradeboxSliceNew {
  TradeboxNew: TradeboxNew;
}
export const createTradeboxSliceNew: SliceCreator<TradeboxSliceNew> = (set, get) => ({
  TradeboxNew: {
    Fees: new BN(0),
    priorityFees: new BN(0),
    slippage: Number(localStorage.getItem('slippage') || '100'),
    btnMessage: '',
    leverageHighTip: false,
    impactFeesTip: false,
    btnDisabled: null,
    isForbiddenTrade: false,
    vobSizeUsd: null,
    // leverageMarks: [1, 2, 5, 10, 15, 25, 50, 75, 100],
    graphObj: null,
    leverage: localStorage.getItem('leverage') || '10',
    payTokenNum: new BN(0),
    limitPrice: new BN(0),
    tradeMoney: new BN(0),
    sizeNumber: new BN(0),
    marketDirection: 'Long',
    marketType: 'Market',
    scale: new BN(0),
    simulationData: {},
    enableTpsl: false,
    bestImpactFees: '',
    simulationImpactFees: '',
    vipFeeValue: new BN(0),
    referralFeeValue: new BN(0),
    setForbiddenTrade: (isForbiddenTrade: boolean) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          isForbiddenTrade,
        },
      }));
    },
    setVobSizeUsd: (vobSizeUsd: BN | null) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          vobSizeUsd,
        },
      }));
    },
    setVipFeeValue: (vipFeeValue: BN) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          vipFeeValue,
        },
      }));
    },
    setReferralFeeValue: (referralFeeValue: BN) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          referralFeeValue,
        },
      }));
    },
    setFees: (Fees: BN) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          Fees,
        },
      }));
    },
    setPriorityFees: (priorityFees: BN) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          priorityFees,
        },
      }));
    },
    setSlippage: (slippage: number) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          slippage,
        },
      }));
    },
    setEnableTpsl: (enableTpsl) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          enableTpsl,
        },
      }));
    },
    setBtnDisabled: (btnDisabled) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          btnDisabled,
        },
      }));
    },
    setBtnMessage: (btnMessage) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          btnMessage,
        },
      }));
    },
    setLeverageHighTip: (leverageHighTip) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          leverageHighTip,
        },
      }));
    },
    setImpactFeesTip: (impactFeesTip) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          impactFeesTip,
        },
      }));
    },
    // setLeverageMarks: (leverageMarks: [1, 2, 5, 10, 15, 25, 50, 75, 100]) => {
    //   set((state) => ({
    //     TradeboxNew: {
    //       ...state.TradeboxNew,
    //       leverageMarks,
    //     },
    //   }));
    // },
    setGraphObj: (graphObj) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          graphObj,
        },
      }));
    },
    setTpsl: (tpsl) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          tpsl,
        },
      }));
    },
    setTpPrice: (tpPrice) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          tpPrice,
        },
      }));
    },
    setSlPrice: (slPrice) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          slPrice,
        },
      }));
    },
    setSimulationData: (simulationData) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          simulationData,
        },
      }));
    },
    setLimitPrice: (limitPrice) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          limitPrice,
        },
      }));
    },
    setPayTokenNum: (payTokenNum) => {
      set((state) => ({
        TradeboxNew: {
          ...state.TradeboxNew,
          payTokenNum,
        },
      }));
    },
    setLeverage: (leverage) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            leverage
          },
        }),
        false,
        'tradebox/setLeverage'
      ),
    setMarketDirection: (marketDirection) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            marketDirection,
          },
        }),
        false,
        'tradebox/setMarketDirection'
      ),
    setMarketType: (marketType) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            marketType,
          },
        }),
        false,
        'tradebox/setMarketType'
      ),
    setScale: (scale) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            scale,
          },
        }),
        false,
        'tradebox/setScale'
      ),
    setSizeNumber: (sizeNumber) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            sizeNumber,
          },
        }),
        false,
        'tradebox/setSizeNumber'
      ),
    setTradeMoney: (tradeMoney) =>
      set(
        (state) => ({
          TradeboxNew: {
            ...state.TradeboxNew,
            tradeMoney,
          },
        }),
        false,
        'tradebox/setTradeMoney'
      ),
  },

});
