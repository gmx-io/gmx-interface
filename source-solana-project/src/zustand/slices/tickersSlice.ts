import { SliceCreator } from '@/zustand/types';

interface Tickers {
  symbol: string;
  price: string | number;
  unitPrice: string | number;
  minUnitPrice: string | number;
  maxUnitPrice: string | number;
}

interface TickersState {
  tickers: Tickers[];
  tokenPriceMap: Map<string, Tickers>;
  setTickers: (tickers: Tickers[], tokenPriceMap: Map<string, Tickers>) => void;
}

export interface TickersSlice {
  tickersState: TickersState;
}

export const createTickersSlice: SliceCreator<TickersSlice> = (set) => ({
  tickersState: {
    tickers: [],
    tokenPriceMap: new Map(),
    setTickers: (tickers, tokenPriceMap) => {
      set((state) => ({
          tickersState: {
            ...state.tickersState,
            tickers,
            tokenPriceMap,
          },
      }));
    },
  },
});