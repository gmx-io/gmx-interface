import { useAppStore } from '@/zustand/useAppStore';
import useSocketStore from '@/zustand/socketStore';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useEffect, useRef } from 'react';

interface Tickers {
  symbol: string;
  price: string | number;
  unitPrice: string | number;
  minUnitPrice: string | number;
  maxUnitPrice: string | number;
}

const THROTTLE_MS = 300;

export const useTickers = () => {
  const { setTickers } = useAppStore((state) => state.tickersState);
  const { tickers } = useSocketStore();

  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!tickers || tickers.length === 0) return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
      return;
    }

    const tickersList = tickers.map((item: Tickers) => ({
      symbol: item?.symbol,
      price: item?.price,
      unitPrice: item?.unitPrice,
      minUnitPrice: item?.minUnitPrice,
      maxUnitPrice: item?.maxUnitPrice,
    }));

    const tempTickersMap = new Map<string, any>();
    tickersList.forEach((item) => {
      tempTickersMap.set(item.symbol, item);
    });

    const tokenPriceMap = new Map<string, any>();
    const tokenEntries = Object.entries(GMX_SOLANA_TOKENS_RAW);

    for (const [key, value] of tokenEntries) {
      const normalizedSymbol = getNormalizedTokenSymbolForFetchingPrice(value.symbol);
      const tickerData = tempTickersMap.get(normalizedSymbol);
      if (tickerData) {
        tokenPriceMap.set(key, tickerData);
      }
      // No fallback: missing price stays absent rather than silently becoming 0
    }

    setTickers(tickersList, tokenPriceMap);

    lastUpdateTimeRef.current = now;

  }, [tickers, setTickers]);
};