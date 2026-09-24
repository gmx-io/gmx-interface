import { create } from 'zustand';

type WsLastUpdatedAtKey =
  | 'mainSocket'
  | 'heliusAccount'
  | 'priceCandle'
  | 'stake';

interface WsLastUpdatedAtState {
  mainSocketLastUpdatedAt: number;
  heliusAccountLastUpdatedAt: number;
  priceCandleLastUpdatedAt: number;
  stakeLastUpdatedAt: number;
  setWsLastUpdatedAt: (key: WsLastUpdatedAtKey, timestamp?: number) => void;
}

export const useWsLastUpdatedAtStore = create<WsLastUpdatedAtState>((set) => ({
  mainSocketLastUpdatedAt: 0,    // main socket -> VITE_GMX_SOLANA_WSS_ENV
  heliusAccountLastUpdatedAt: 0, // helius socket -> VITE_HELIUS_WSS_ENDPOINT
  priceCandleLastUpdatedAt: 0,   // priceCandle socket -> VITE_PRICE_CANDLE_WSS_ENDPOINT 
  stakeLastUpdatedAt: 0,         // stake socket -> VITE_STAKE_WSS_ENDPOINT
  setWsLastUpdatedAt: (key, timestamp = Date.now()) => {
    const field = `${key}LastUpdatedAt` as const;
    set({ [field]: timestamp } as Pick<WsLastUpdatedAtState, typeof field>);
  },
}));
