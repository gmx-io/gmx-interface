import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const GM_GLV_PRICE_HISTORY_KEY = 'data_store/gm_glv_price_history';

interface MarketGmPriceResponse {
  data: {
    marketGmPriceDailies: Array<{
      gmPriceNow: string;
      gmPrice7d: string;
      timestamp: string;
      updateTime: string;
      marketToken: string;
    }>;
    glvPriceDailies: Array<{
      glvPriceNow: string;
      glvPrice7d: string;
      timestamp: string;
      updateTime: string;
      glvToken: string;
    }>;
  };
}

export interface PriceDataPoint {
  price: BN;
  timestamp: number;
}

export type GmGlvPriceHistoryResult = {
  priceHistory: PriceDataPoint[];
  isLoading: boolean;
  totalPriceChange: number;
};

export const useGmGlvPriceHistory = (tokenAddress?: string, isGlv = false) => {
  const { data, isLoading } = useSWR<GmGlvPriceHistoryResult>(
    tokenAddress ? [GM_GLV_PRICE_HISTORY_KEY, tokenAddress, isGlv] : null,
    async (key) => {
      try {
        const address = key[1] as string;
        const isGlvToken = key[2] as boolean;

        const query = `
          query {
            marketGmPriceDailies {
              gmPriceNow
              gmPrice7d
              timestamp
              updateTime
              marketToken
            }
            glvPriceDailies(orderBy: timestamp_DESC) {
              glvPriceNow
              glvPrice7d
              timestamp
              updateTime
              glvToken
            }
          }
        `;

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as MarketGmPriceResponse;

        // Process the returned data based on whether it's GLV or GM
        let dataPoints: PriceDataPoint[] = [];

        if (isGlvToken && result.data?.glvPriceDailies) {
          dataPoints = result.data.glvPriceDailies
            .filter((point) => point.glvToken === address)
            .map((point) => ({
              price: new BN(point.glvPriceNow),
              timestamp: new Date(point.timestamp).getTime(),
            }))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
        } else if (!isGlvToken && result.data?.marketGmPriceDailies) {
          dataPoints = result.data.marketGmPriceDailies
            .filter((point) => point.marketToken === address)
            .map((point) => ({
              price: new BN(point.gmPriceNow),
              timestamp: new Date(point.timestamp).getTime(),
            }))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
        }

        // Calculate total price change
        let totalPriceChange = 0;
        if (dataPoints.length > 0) {
          // Get the first price from the last 30 data points
          const startIndex = Math.max(0, dataPoints.length - 30);
          const firstPrice = dataPoints[startIndex].price.toNumber();
          const lastPrice = dataPoints[dataPoints.length - 1].price.toNumber();
          totalPriceChange = firstPrice
            ? ((lastPrice - firstPrice) / firstPrice) * 100
            : 0;
        }

        return {
          priceHistory: dataPoints,
          isLoading: false,
          totalPriceChange,
        };
      } catch (error) {
        console.error('Error fetching price history:', error);
        return {
          priceHistory: [],
          isLoading: false,
          totalPriceChange: 0,
        };
      }
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 1000, // Refresh every minute
    }
  );

  return {
    priceHistory: data?.priceHistory || [],
    isLoading: isLoading || !data,
    totalPriceChange: data?.totalPriceChange || 0,
  };
};
