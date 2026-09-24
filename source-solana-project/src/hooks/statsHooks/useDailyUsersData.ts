import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const DAILY_USERS_KEY = 'data_store/daily_users';

interface DailyUsersResponse {
  data: {
    userRecordDailies: Array<{
      dailySwapUsers: string;
      dailyTotalUsers: string;
      dailyTradeUsers: string;
      dailyNewUsers: string;
      timestamp: string;
    }>;
  };
}

export interface DailyUsersData {
  dailySwapUsers: BN;
  dailyTotalUsers: BN;
  dailyTradeUsers: BN;
  dailyNewUsers: BN;
  timestamp: string;
}

export const useDailyUsersData = () => {
  const { data, isLoading } = useSWR<DailyUsersData[]>(
    DAILY_USERS_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                userRecordDailies {
                  dailySwapUsers
                  dailyTotalUsers
                  dailyTradeUsers
                  dailyNewUsers
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as DailyUsersResponse;

        if (!result.data?.userRecordDailies) {
          throw new Error('Invalid response format');
        }

        return result.data.userRecordDailies
          .map((record) => ({
            dailySwapUsers: new BN(record.dailySwapUsers),
            dailyTotalUsers: new BN(record.dailyTotalUsers),
            dailyTradeUsers: new BN(record.dailyTradeUsers),
            dailyNewUsers: new BN(record.dailyNewUsers),
            timestamp: record.timestamp,
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      } catch (error) {
        console.error('Error fetching daily users:', error);
        return [];
      }
    },
    {}
  );

  return {
    dailyUsersData: data ?? [],
    isLoading,
  };
};
