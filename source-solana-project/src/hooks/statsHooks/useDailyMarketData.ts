import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const DAILY_MARKET_KEY = 'data_store/daily_market';

interface DailyMarketResponse {
  data: {
    marketDailyStats: Array<{
      marketToken: string;
      dailyTradesPnl: string;
      dailyLiquidationValue: string;
      dailyTradeSize: string;
      dailyTrades: string;
      timestamp: string;
    }>;
  };
}

export interface MarketDailyStats {
  marketToken: string;
  dailyTradesPnl: BN;
  dailyLiquidationValue: BN;
  dailyTradeSize: BN;
  dailyTrades: string;
  timestamp: string;
}

export const useDailyMarketData = () => {
  const { data, isLoading } = useSWR<MarketDailyStats[]>(
    DAILY_MARKET_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                marketDailyStats {
                  marketToken
                  dailyTradesPnl
                  dailyLiquidationValue
                  dailyTradeSize
                  dailyTrades
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as DailyMarketResponse;

        if (!result.data?.marketDailyStats) {
          throw new Error('Invalid response format');
        }

        return result.data.marketDailyStats
          .map((record) => ({
            marketToken: record.marketToken,
            dailyTradesPnl: new BN(record.dailyTradesPnl),
            dailyLiquidationValue: new BN(record.dailyLiquidationValue),
            dailyTradeSize: new BN(record.dailyTradeSize),
            dailyTrades: record.dailyTrades,
            timestamp: record.timestamp,
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      } catch (error) {
        console.error('Error fetching daily market data:', error);
        return [];
      }
    },
    {}
  );

  return {
    dailyMarketData: data ?? [],
    isLoading,
  };
};
