import { useStoreProgram } from '@/contexts/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getPriorityFees } from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import useSWR from 'swr';
import { BN } from '@coral-xyz/anchor';
import { useEffect } from 'react';

export const usePriorityFees = () => {
    const storeProgram = useStoreProgram();
    const {
        setPriorityFees,
    } = useAppStore(useShallow((state) => state.TradeboxNew));
    const { data } = useSWR(
        'priorityFees',
        async () => {
            const priorityFees = await getPriorityFees(storeProgram.provider.connection);
            return priorityFees;
        },
        {
            refreshInterval: 10000,
        }
    );

    useEffect(() => {
        if (data) {
            setPriorityFees(new BN(data));
        }
    }, [data, setPriorityFees]);
}
