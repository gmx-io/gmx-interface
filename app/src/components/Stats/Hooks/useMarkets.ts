import useSocketStore from '@/zustand/socketStore';
import useSWR from 'swr';

export const useMarkets = () => {
    const { indexTokens } = useSocketStore();
    const { data } = useSWR(
        ['markets-info-new', indexTokens?.length],
        () => {
            const safeIndexTokens = Array.isArray(indexTokens) ? indexTokens : [];

            const newIndexTokens = safeIndexTokens.map((data) => {
                const newData = { ...data, marketDecimals: data?.marketInfos?.[0]?.marketDecimals };
                return newData;
            })

            return {
                indexTokens: newIndexTokens,
            };
        },
        {
            refreshInterval: 1000,
            revalidateOnMount: true,
        }
    );

    return {
        indexTokens: data?.indexTokens ?? [],
    };
}
