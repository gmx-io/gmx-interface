import { useStoreProgram } from '@/contexts/anchor';
import { getPriorityFees } from '@/components/TradeBoxNew/utils/getRpcOrSdkParams';
import useSWR from 'swr';

export const usePriorityFees = () => {
    const storeProgram = useStoreProgram();
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
    return data;
}
