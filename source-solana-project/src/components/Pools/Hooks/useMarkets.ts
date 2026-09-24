import useSocketStore from '@/zustand/socketStore';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import useSWR from 'swr';

const EMPTY_MARKET_INFOS: any[] = [];
const EMPTY_MARKET_INFOS_MAP = new Map<string, any>();

export const useMarkets = () => {
    const { indexTokens } = useSocketStore();
    const { tokenPriceMap } = useTokenPriceMap();
    const isTokenPriceMapLoading = !tokenPriceMap || Object.keys(tokenPriceMap).length === 0;

    const { data, isLoading } = useSWR(
        !isTokenPriceMapLoading && indexTokens ? 'pools-markets-info' : null,
        () => {
            const allMarketInfosArray: any[] = [];
            const safeIndexTokens = Array.isArray(indexTokens) ? indexTokens : [];

            for (const token of safeIndexTokens) {
                const marketInfos = Array.isArray(token?.marketInfos) ? token.marketInfos : [];
                for (const item of marketInfos) {
                    const indexTokenPrice = tokenPriceMap[item?.indexToken];
                    const longTokenPrice = tokenPriceMap[item?.longToken];
                    const shortTokenPrice = tokenPriceMap[item?.shortToken];

                    item.newPrices = {
                        indexToken: {
                            min: indexTokenPrice?.minUnitPrice ?? 0,
                            max: indexTokenPrice?.maxUnitPrice ?? 0,
                        },
                        longToken: {
                            min: longTokenPrice?.minUnitPrice ?? 0,
                            max: longTokenPrice?.maxUnitPrice ?? 0,
                        },
                        shortToken: {
                            min: shortTokenPrice?.minUnitPrice ?? 0,
                            max: shortTokenPrice?.maxUnitPrice ?? 0,
                        },
                    };

                    allMarketInfosArray.push(item);
                }
            }

            const marketInfosMap = new Map<string, any>();
            for (const info of allMarketInfosArray) {
                if (!info.marketToken) continue;
                marketInfosMap.set(info.marketToken, info);
            }

            return { allMarketInfos: allMarketInfosArray, marketInfosMap };
        },
        {
            refreshInterval: 5000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            keepPreviousData: true,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 3000,
        }
    );
    return {
        marketInfosMap: data?.marketInfosMap ?? EMPTY_MARKET_INFOS_MAP,
        allMarketInfos: data?.allMarketInfos ?? EMPTY_MARKET_INFOS,
        isLoading: isLoading || isTokenPriceMapLoading
    };
}
