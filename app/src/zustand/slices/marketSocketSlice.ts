import { SliceCreator } from '@/zustand/types';

export interface MarketSocket {
    marketInfos: any[];
    setMarketInfos: (marketInfos: any[]) => void;
}

export interface MarketSocketSlice {
    MarketSocket: MarketSocket;
}
export const createMarketSocketSlice: SliceCreator<MarketSocketSlice> = (set, get) => ({
    MarketSocket: {
        marketInfos: [],
        setMarketInfos: (marketInfos) => set((state) => ({
            MarketSocket: {
                ...state.MarketSocket,
                marketInfos
            }
        })),
    }
})
