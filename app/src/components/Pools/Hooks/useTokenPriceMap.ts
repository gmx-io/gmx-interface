import { BN } from '@coral-xyz/anchor';
import useSocketStore from '@/zustand/socketStore';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useEffect, useState } from 'react';

interface TokenPrices {
    symbol: string;
    price: string | number;
    unitPrice: string | number;
    minUnitPrice: string | number;
    maxUnitPrice: string | number;
    minPrice: BN;
    maxPrice: BN;
}

export const useTokenPriceMap = () => {
    const { tickers } = useSocketStore();
    const [tokenPriceMap, setTokenPriceMap] = useState<Record<string, TokenPrices>>({});
    useEffect(() => {
        if (!tickers.length) return;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const tickersList = tickers.map((item: TokenPrices) => {
            return {
                symbol: item?.symbol,
                price: item?.price,
                unitPrice: item?.unitPrice,
                minUnitPrice: item?.minUnitPrice,
                maxUnitPrice: item?.maxUnitPrice,
                minPrice: item?.minPrice,
                maxPrice: item?.maxPrice,
            }
        })
        const tickersMap: Record<string, TokenPrices> = {};
        tickersList.forEach((item) => {
            tickersMap[item.symbol] = item;
        })
        const tokenPriceMap: Record<string, TokenPrices> = {};
        Object.entries(GMX_SOLANA_TOKENS_RAW).forEach(([key, value]) => {
            const entry = tickersMap[getNormalizedTokenSymbolForFetchingPrice(value.symbol)];
            if (entry) tokenPriceMap[key] = entry;
            // No fallback: missing price stays absent rather than silently becoming 0
        })
        setTokenPriceMap(tokenPriceMap);
    }, [tickers]);
    return { tokenPriceMap };
};

