import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const DAILY_VOLUME_KEY = 'data_store/daily_volume';

interface DailyVolumeResponse {
  data: {
    volumeRecordDailies: Array<{
      tradeVolume: string;
      totalVolume: string;
      swapVolume: string;
      timestamp: string;
      tradeTrades: string;
      tradeSize: string;
      swapTrades: string;
      totalTrades: string;
    }>;
  };
}

export interface DailyVolumeData {
  tradeVolume: BN;
  swapVolume: BN;
  totalVolume: BN;
  timestamp: string;
  tradeTrades: BN;
  tradeSize: BN;
  swapTrades: BN;
  totalTrades: BN;
}

export const useDailyVolumeData = () => {
  const { data, isLoading } = useSWR<DailyVolumeData[]>(
    DAILY_VOLUME_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                volumeRecordDailies {
                  tradeVolume
                  totalVolume
                  swapVolume
                  timestamp
                  tradeTrades
                  tradeSize
                  swapTrades
                  totalTrades
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as DailyVolumeResponse;

        if (!result.data?.volumeRecordDailies) {
          throw new Error('Invalid response format');
        }

        return result.data.volumeRecordDailies
          .map((record) => ({
            tradeVolume: new BN(record.tradeVolume),
            swapVolume: new BN(record.swapVolume),
            totalVolume: new BN(record.totalVolume),
            timestamp: record.timestamp,
            tradeTrades: new BN(record.tradeTrades),
            tradeSize: new BN(record.tradeSize),
            swapTrades: new BN(record.swapTrades),
            totalTrades: new BN(record.totalTrades),
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      } catch (error) {
        console.error('Error fetching daily volume:', error);
        return [];
      }
    },
    {}
  );

  return {
    dailyVolumeData: data ?? [],
    isLoading,
  };
};
