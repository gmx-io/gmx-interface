import { GRAPHQL_ENDPOINT_2 } from '@/config/url';
import useSWR from 'swr';

const GT_BUYBACK_PRICE_HISTORY_KEY = 'data_store/gt_buyback_price_history';

interface GtBuybackPriceHistoryResponse {
  data: {
    confirmGtBuybacks: Array<{
      id: string;
      buybackPrice: string;
      timestamp: string;
    }>;
  };
}

export interface GtBuybackPriceDataPoint {
  date: string;
  buybackPrice: number;
}

export const useGtBuybackPriceHistory = () => {
  const { data, isLoading } = useSWR<GtBuybackPriceDataPoint[]>(
    GT_BUYBACK_PRICE_HISTORY_KEY,
    async () => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT_2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query MyQuery {
                confirmGtBuybacks {
                  id
                  buybackPrice
                  timestamp
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GtBuybackPriceHistoryResponse;

        if (!result.data?.confirmGtBuybacks) {
          throw new Error('Invalid response format');
        }

        // Convert to price data points without filtering zero prices
        const buybackPriceHistory = result.data.confirmGtBuybacks.map(
          (item) => {
            // Convert to USD using the correct decimal conversion (divide by 10^13)
            const buybackPriceUSD = parseFloat(item.buybackPrice) / 1e13;
            return {
              date: item.timestamp,
              buybackPrice: buybackPriceUSD,
            };
          }
        );

        return buybackPriceHistory;
      } catch (error) {
        console.error('Error fetching GT buyback price history:', error);
        return [];
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // cache for 1 minute
    }
  );

  return {
    buybackPriceHistory: data ?? [],
    isLoading,
  };
};
