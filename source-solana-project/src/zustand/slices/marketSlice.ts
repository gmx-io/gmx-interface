import { SliceCreator } from '@/zustand/types';
import { Market, MarketState, MarketStatus } from '@/selectors/market/types';
import { getGmw347Enabled, getGmw379Enabled } from '@/config/featureFlagEnable';
import isEqual from 'lodash/isEqual';

export interface marketInfo {
  longToken: string;
  shortToken: string;
  indexToken: string;
  marketToken: string;
  openInterestForLong: string;
  openInterestForShort: string;
  volume24h: string;
  openInterestForLongRate: string;
  openInterestForShortRate: string;
  lpLong: string;
  lpShort: string;
  longNetRatePerHour: string;
  shortNetRatePerHour: string;
  collateralMismatch: boolean;
  unitPrice: string;
  supply: string;
  isAuto: boolean;
  minCollateralValue: string;
  mCMCFForLiquidation?: string;
  closed?: boolean
}
interface Markets {
  markets: marketInfo[];
  marketsMap: Map<string, any>;
  marketBase64Map: Map<string, string>;
  marketInfos: marketInfo[];
  marketInfo: marketInfo;
  clickPoolAuto: boolean;
  hasPoolChange: boolean;
  marketImpactList: any[];
  // On-chain market data (keyed by marketTokenAddress base58)
  marketsOnChain: Record<string, Market>;
  marketsState: Record<string, MarketState>;
  marketsStatus: Record<string, MarketStatus>;
  isMarketLoading: boolean;
  isMarketTokenLoading: boolean;
  marketTokenMetadatas: Record<string, any>;
  marketTokenPrices: Record<string, any>;
  setMarketImpactList: (marketImpactList: any[]) => void;
  setMarkets: (markets: marketInfo[]) => void;
  setMarketsMap: (marketsMap: Map<string, any>) => void;
  setMarketBase64Map: (marketBase64Map: Map<string, string>) => void;
  setMarketInfos: (marketInfos: marketInfo[]) => void;
  setMarketInfo: (marketInfo: marketInfo) => void;
  setClickPoolAuto: (clickPoolAuto: boolean) => void;
  setHasPoolChange: (hasPoolChange: boolean) => void;
  setMarket: (key: string, market: Market) => void;
  setMarketState: (key: string, marketState: MarketState) => void;
  setMarketStatus: (key: string, status: MarketStatus) => void;
  setAllMarketStatuses: (statuses: Record<string, MarketStatus>) => void;
  setAllMarketsAndStates: (data: Record<string, { meta: Market; state: MarketState }>) => void;
  setAllMarketAccountData: (
    data: Record<string, { meta: Market; state: MarketState }>,
    marketBase64Map: Map<string, string>
  ) => void;
  setIsMarketLoading: (loading: boolean) => void;
  setIsMarketTokenLoading: (loading: boolean) => void;
  setMarketTokenMetadata: (key: string, metadata: any) => void;
  setMarketTokenPrice: (key: string, price: any) => void;
}

export interface MarketSlice {
  markets: Markets;
}

export const createMarketSlice: SliceCreator<MarketSlice> = (set, get) => ({
  markets: {
    markets: [],
    marketInfo: {} as marketInfo,
    marketInfos: [] as marketInfo[],
    marketsMap: new Map<string, any>(),
    marketBase64Map: new Map<string, string>(),
    clickPoolAuto: true,
    hasPoolChange: false,
    marketImpactList: [] as any[],
    marketsOnChain: {},
    marketsState: {},
    marketsStatus: {},
    isMarketLoading: false,
    isMarketTokenLoading: false,
    marketTokenMetadatas: {},
    marketTokenPrices: {},
    setMarket: (key, market) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketsOnChain: { ...state.markets.marketsOnChain, [key]: market },
        },
      }));
    },
    setMarketState: (key, marketState) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketsState: { ...state.markets.marketsState, [key]: marketState },
        },
      }));
    },
    setAllMarketsAndStates: (data) => {
      const marketsOnChain: Record<string, Market> = {};
      const marketsState: Record<string, MarketState> = {};
      for (const [key, value] of Object.entries(data)) {
        marketsOnChain[key] = value.meta;
        marketsState[key] = value.state;
      }
      set((state) => ({
        markets: {
          ...state.markets,
          marketsOnChain,
          marketsState,
        },
      }));
    },
    setAllMarketAccountData: (data, marketBase64Map) => {
      const marketsOnChain: Record<string, Market> = {};
      const marketsState: Record<string, MarketState> = {};
      for (const [key, value] of Object.entries(data)) {
        marketsOnChain[key] = value.meta;
        marketsState[key] = value.state;
      }
      set((state) => ({
        markets: {
          ...state.markets,
          marketsOnChain,
          marketsState,
          marketBase64Map,
        },
      }));
    },
    setMarketStatus: (key, status) => {
      if (getGmw347Enabled()) {
        const current = get().markets.marketsStatus[key];
        if (isEqual(current, status)) {
          return;
        }
      }
      set((state) => ({
        markets: {
          ...state.markets,
          marketsStatus: { ...state.markets.marketsStatus, [key]: status },
        },
      }));
    },
    setAllMarketStatuses: (statuses) => {
      if (!getGmw379Enabled()) {
        if (!getGmw347Enabled()) {
          for (const [key, status] of Object.entries(statuses)) {
            get().markets.setMarketStatus(key, status);
          }
          return;
        }

        const current = get().markets.marketsStatus;
        const updates: Record<string, MarketStatus> = {};
        for (const [key, status] of Object.entries(statuses)) {
          if (!isEqual(current[key], status)) updates[key] = status;
        }
        if (Object.keys(updates).length === 0) return;
        set((state) => ({
          markets: {
            ...state.markets,
            marketsStatus: { ...state.markets.marketsStatus, ...updates },
          },
        }));
        return;
      }

      const current = get().markets.marketsStatus;
      if (isEqual(current, statuses)) return;

      set((state) => ({
        markets: {
          ...state.markets,
          marketsStatus: statuses,
        },
      }));
    },
    setIsMarketLoading: (loading) => {
      set((state) => ({
        markets: { ...state.markets, isMarketLoading: loading },
      }));
    },
    setIsMarketTokenLoading: (loading) => {
      set((state) => ({
        markets: { ...state.markets, isMarketTokenLoading: loading },
      }));
    },
    setMarketTokenMetadata: (key, metadata) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketTokenMetadatas: { ...state.markets.marketTokenMetadatas, [key]: metadata },
        },
      }));
    },
    setMarketTokenPrice: (key, price) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketTokenPrices: { ...state.markets.marketTokenPrices, [key]: price },
        },
      }));
    },
    setMarketImpactList: (marketImpactList) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketImpactList,
        },
      }));
    },
    setMarkets: (markets) => {
      set((state) => ({
        markets: {
          ...state.markets,
          markets,
        },
      }));
    },

    setMarketsMap: (marketsMap) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketsMap,
        },
      }));
    },

    setMarketBase64Map: (marketBase64Map) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketBase64Map,
        },
      }));
    },

    setMarketInfos: (marketInfos) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketInfos,
        },
      }));
    },
    setMarketInfo: (marketInfo) => {
      set((state) => ({
        markets: {
          ...state.markets,
          marketInfo,
        },
      }));
    },
    setClickPoolAuto: (clickPoolAuto) => {
      set((state) => ({
        markets: {
          ...state.markets,
          clickPoolAuto,
        },
      }));
    },
    setHasPoolChange: (hasPoolChange) => {
      set((state) => ({
        markets: {
          ...state.markets,
          hasPoolChange,
        },
      }));
    },
  },
});
