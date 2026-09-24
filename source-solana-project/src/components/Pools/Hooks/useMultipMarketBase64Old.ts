import {
    getMultipMarketBase64,
} from '@/components/TradeBoxNew/utils/getRpcOrSdkParams'
import { useStoreProgram } from '@/contexts/anchor';
import { GMX_SOLANA_MARKET_TOKENS } from '@/config/program';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import useSWR from 'swr';
import { useMemo } from 'react';

export const useMultipMarketBase64 = () => {
    const storeProgram = useStoreProgram();
    const marketBase64Map = useAppStore(
        useShallow((state) => state.markets.marketBase64Map)
    );
    const addressArray = GMX_SOLANA_MARKET_TOKENS;
    const { data } = useSWR(
        'multiMarketBase64',
        async () => {
            try {
                const resMap = new Map<string, string>();
                const res = (await getMultipMarketBase64(
                    addressArray,
                    storeProgram
                )) as Array<{ data: Buffer } | null>;
                for (let index = 0; index < res.length; index++) {
                    if (!res[index]) {
                        continue;
                    }
                    const element = res[index];
                    resMap.set(
                        addressArray[index].toBase58(),
                        element.data.toString('base64')
                    );
                }
                return {
                    time: new Date().getTime(),
                    resMap,
                };
            } catch (error) {
                console.log('useMultipMarketBase64 error1', error);
            }
        },
        {
            refreshInterval: 5000,
        }
    );
    const mergedMarketBase64Map = useMemo(() => {
        return new Map([
            ...(data?.resMap ?? new Map<string, string>()),
            ...marketBase64Map,
        ]);
    }, [data?.resMap, marketBase64Map]);

    return mergedMarketBase64Map;
};
