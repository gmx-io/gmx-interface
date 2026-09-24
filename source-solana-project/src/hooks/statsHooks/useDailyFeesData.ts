import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const DAILY_FEES_KEY = 'data_store/daily_fees';

interface DailyFeesResponse {
  data: {
    feesRecordDailies: Array<{
      tradeFees: string;
      totalFees: string;
      swapFees: string;
      timestamp: string;
    }>;
  };
}

export interface DailyFeesData {
  tradeFees: BN;
  swapFees: BN;
  totalFees: BN;
  timestamp: string;
}

export const useDailyFeesData = () => {
  const { data, isLoading } = useSWR<DailyFeesData[]>(
    DAILY_FEES_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                feesRecordDailies {
                  tradeFees
                  totalFees
                  swapFees
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as DailyFeesResponse;

        if (!result.data?.feesRecordDailies) {
          throw new Error('Invalid response format');
        }

        return result.data.feesRecordDailies
          .map((record) => ({
            tradeFees: new BN(record.tradeFees),
            swapFees: new BN(record.swapFees),
            totalFees: new BN(record.totalFees),
            timestamp: record.timestamp,
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      } catch (error) {
        console.error('Error fetching daily fees:', error);
        return [];
      }
    },
    {}
  );

  return {
    dailyFeesData: data ?? [],
    isLoading,
  };
};
