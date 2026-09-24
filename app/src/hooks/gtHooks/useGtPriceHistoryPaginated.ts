import { GRAPHQL_ENDPOINT, GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';
import { calculateDaysBetweenDates, getRecentDays } from '@/utils';
import dayjs from 'dayjs';
import useSWR from 'swr';

const GT_PRICE_HISTORY_KEY = 'data_store/gt_price_history_paginated';

export interface GtPriceDataPoint {
  date: string;
  price: number;
  percentage: number;
  cycle: number;
}

interface GtPriceHistory {
  mintingCost: number | string;
  timestamp: string;
}

interface GtUpdated {
  totalMinted: number | string;
  timestamp: string;
}

interface HistoryItem {
  date: string;
  name: string;
  totalMinted: number | string;
  mintingCost: number | string;
  buybackPrice: number | string;
  buybackAmount: number | string;
  buybackValue: number | string;
}

export const useGtPriceHistoryPaginated = (
  days: number = 0,
  enabled = true
) => {
  const { data, isLoading } = useSWR(
    enabled ? GT_PRICE_HISTORY_KEY : null,
    async () => {
      try {
        const startDate = '2025-03-08T00:00:00.000Z';

        const [graphqlResponse, gtUpdatesResponse] = await Promise.all([
          fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query MyQuery {
                gtGlobalHistories(where: {}) {
                  mintingCost
                  timestamp
                }
              }`,
              operationName: 'MyQuery',
              variables: null,
            }),
          }),
          fetchWithTimeoutLog(
            `${GMX_SOLANA_API_ENDPOINT}/v2/cache/daily/gtUpdates`
          ),
        ]);

        if (!gtUpdatesResponse.ok) {
          throw new Error(`HTTP ${gtUpdatesResponse.status}`);
        }

        const gtUpdateds = (await gtUpdatesResponse.json()) as GtUpdated[];
        const {
          data: { gtGlobalHistories },
        }: {
          data: {
            gtGlobalHistories: GtPriceHistory[];
          };
        } = await graphqlResponse.json();

        const mintingCostMap: Record<string, GtPriceHistory> = {};
        const totalMintedMap: Record<string, GtUpdated> = {};

        gtGlobalHistories.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          mintingCostMap[timestamp] = {
            mintingCost: (
              (item.mintingCost ? Number(item.mintingCost) : 0) /
              10 ** 13
            ).toFixed(4),
            timestamp,
          };
        });

        gtUpdateds.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          totalMintedMap[timestamp] = {
            // totalMinted convert to M: 254062684774289 -> 25.41 M
            totalMinted: (item.totalMinted
              ? Number(item.totalMinted) / 10 ** (7 + 6)
              : 0
            ).toFixed(2),
            timestamp,
          };
        });

        const dayRange = getRecentDays(
          calculateDaysBetweenDates(dayjs.utc().toISOString(), startDate)
        );
        const historyList: HistoryItem[] = [];
        dayRange.reverse().reduce((acc: HistoryItem, date) => {
          const item = {
            date: date,
            name: date,
            totalMinted:
              totalMintedMap[date]?.totalMinted || acc?.totalMinted || 0,
            mintingCost:
              mintingCostMap[date]?.mintingCost || acc?.mintingCost || 0,
            buybackPrice: acc?.buybackPrice || 0,
            buybackValue: acc?.buybackValue || 0,
            buybackAmount: acc?.buybackAmount || 0,
          };
          historyList.push(item);
          return item;
        }, {} as HistoryItem);

        return historyList;
      } catch (error) {
        console.error('Error fetching GT price history:', error);
        return [];
      }
    },
    {}
  );

  return {
    priceHistory: data ? data.slice(days ? -days : 4) : [],
    isLoading,
  };
};
