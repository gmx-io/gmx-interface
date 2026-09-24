import { useAppStore } from '@/zustand/useAppStore';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export const useTokenPriceMap = () => {
    const mainPriceMap = useAppStore(
        useShallow((state) => state.tickersState.tokenPriceMap)
    );
    const tokenPriceMap = useMemo(() => {
        const record: Record<string, any> = {};
        for (const [key, value] of mainPriceMap) {
            record[key] = value;
        }
        return record;
    }, [mainPriceMap]);
    return { tokenPriceMap, isLoading: mainPriceMap.size === 0 };
};
