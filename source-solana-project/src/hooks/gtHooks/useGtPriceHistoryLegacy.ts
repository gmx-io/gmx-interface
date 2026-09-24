import { GRAPHQL_ENDPOINT, GRAPHQL_ENDPOINT_2 } from '@/config/url';
import { calculateDaysBetweenDates, getRecentDays } from '@/utils';
import { GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';
import dayjs from 'dayjs';
import useSWR from 'swr';

const GT_PRICE_HISTORY_LEGACY_KEY = 'data_store/gt_price_history_legacy';

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
interface GtBuyback {
  buybackPrice: number | string;
  buybackAmount: number | string;
  buybackValue: number | string;
  timestamp: string;
}
interface ConfirmGtBuyback {
  buybackPrice: number | string;
  timestamp: string;
  logs: string;
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

export const useGtPriceHistoryLegacy = (days: number = 0, enabled = true) => {
  const { data, isLoading } = useSWR(
    enabled ? GT_PRICE_HISTORY_LEGACY_KEY : null,
    async () => {
      try {
        // const startDate = days ? dayjs().utc().subtract(days, 'day').startOf('day').toISOString() : '2025-03-09T00:00:00.000Z'
        const startDate = '2025-03-08T00:00:00.000Z';
        const gtBuybacksDate = '2025-06-23T00:00:00.000Z';
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          //  gtUpdateds(where: {
          //       receiverDelta_gt: "0",
          //     }) {
          //       timestamp
          //       totalMinted
          //     }
          body: JSON.stringify({
            query: `query MyQuery {
              gtGlobalHistories(where: {
              }) {
                mintingCost
                timestamp
              }
              gtBuybacks(where: {}) {
                buybackAmount
                buybackValue
                buybackPrice
                timestamp
              }
            }`,
            operationName: 'MyQuery',
            variables: null,
          }),
        });

        const url = `${GMX_SOLANA_API_ENDPOINT}/v2/cache/daily/gtUpdates`;
        const res = await fetchWithTimeoutLog(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const gtUpdateds = await res.json();
        // console.log('useGtPriceHistory gtUpdates: ', json);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {
          data: {
            gtBuybacks,
            // gtUpdateds,
            gtGlobalHistories,
          },
        }: {
          data: {
            gtGlobalHistories: GtPriceHistory[];
            // gtUpdateds: GtUpdated[],
            gtBuybacks: GtBuyback[];
          };
        } = await response.json();
        const mintingCostMap: {
          [key: string]: GtPriceHistory;
        } = {};
        const totalMintedMap: {
          [key: string]: GtUpdated;
        } = {};
        const gtBuybacksMap: {
          [key: string]: GtBuyback;
        } = {};
        gtGlobalHistories.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          mintingCostMap[item.timestamp.slice(0, 10)] = {
            mintingCost: (
              (item.mintingCost ? Number(item.mintingCost) : 0) /
              10 ** 13
            ).toFixed(4),
            timestamp: timestamp,
          };
        });
        gtUpdateds.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          totalMintedMap[timestamp] = {
            totalMinted: (item.totalMinted
              ? Number(item.totalMinted) / 10 ** (7 + 6)
              : 0
            ).toFixed(2),
            timestamp: timestamp,
          };
        });
        gtBuybacks.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          const buybackPrice = item.buybackPrice
            ? Number(item.buybackPrice)
            : 0;
          const buybackAmount = item.buybackAmount
            ? Number(item.buybackAmount)
            : 0;
          const buybackValue = item.buybackValue
            ? Number(item.buybackValue)
            : 0;
          gtBuybacksMap[timestamp] = {
            timestamp: timestamp,
            buybackPrice: (buybackPrice / 10 ** 13).toFixed(4),
            buybackValue: (buybackValue / 10 ** 20).toFixed(2),
            buybackAmount: (buybackAmount / 10 ** 7).toFixed(2),
          };
        });
        const response1 = await fetch(GRAPHQL_ENDPOINT_2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query MyQuery {
              confirmGtBuybacks(where: {
                timestamp_lt: "${gtBuybacksDate}"
              }) {
                buybackPrice
                timestamp
                logs
              }
            }`,
            operationName: 'MyQuery',
            variables: null,
          }),
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {
          data: { confirmGtBuybacks },
        }: {
          data: {
            confirmGtBuybacks: ConfirmGtBuyback[];
          };
        } = await response1.json();
        confirmGtBuybacks.forEach((item) => {
          const timestamp = item.timestamp.slice(0, 10);
          const buybackPrice = item.buybackPrice
            ? Number(item.buybackPrice)
            : 0;
          const buybackValue = item.logs.match(/value:\s*(\d+)/)
            ? Number(item.logs.match(/value:\s*(\d+)/)?.[1])
            : 0;
          gtBuybacksMap[timestamp] = {
            timestamp: timestamp,
            buybackPrice: (buybackPrice / 10 ** 13).toFixed(4),
            buybackValue: (buybackValue / 10 ** 20).toFixed(2),
            buybackAmount: (
              (buybackValue && item.buybackPrice
                ? buybackValue / item.buybackPrice
                : 0) /
              10 ** 7
            ).toFixed(2),
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
            buybackPrice:
              gtBuybacksMap[date]?.buybackPrice || acc?.buybackPrice || 0,
            buybackValue:
              gtBuybacksMap[date]?.buybackValue || acc?.buybackValue || 0,
            buybackAmount:
              gtBuybacksMap[date]?.buybackAmount || acc?.buybackAmount || 0,
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

  // console.log('data', data)

  return {
    priceHistory: data ? data.slice(days ? -days : 4) : [],
    isLoading,
  };
};
