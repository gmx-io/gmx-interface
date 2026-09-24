import { GRAPHQL_ENDPOINT } from '@/config/url';
import { formatRatePercentage } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import useSWR from 'swr';
import { useShallow } from 'zustand/react/shallow';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
export interface FundingRateItem {
  id: string;
  marketToken: PublicKey;
  longFundingRate: BN;
  shortFundingRate: BN;
  timestamp: string;
  updateTime: string;
  timehhmm: string;
}

interface GraphQLFundingRateEvent {
  id: string;
  marketToken: PublicKey;
  longFundingRate: BN;
  shortFundingRate: BN;
  timestamp: string;
  updateTime: string;
  timehhmm: string;
}

interface GraphQLResponse {
  data: {
    fundingRateHourlies: GraphQLFundingRateEvent[];
  };
}

const MARKET_TRADES_KEY = 'data_store/funding_rate';

export const useFundingRateData = () => {
  const { marketInfo } = useAppStore(useShallow((state) => state.markets));

  const { data, isLoading } = useSWR<FundingRateItem[]>(
    marketInfo.marketToken ? `${MARKET_TRADES_KEY}-${marketInfo.marketToken.toString()}` : null,
    async () => {
      try {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                fundingRateHourlies(
                  orderBy: timestamp_ASC,
                  where: {
                    marketToken_eq: ${JSON.stringify(marketInfo.marketToken)},
                    timestamp_gte: ${JSON.stringify(since)}
                  }
                ) {
                  id
                  fundingFactorPerSecond
                  longFundingRate
                  marketToken
                  openInterestForLongLongTokenAmount
                  openInterestForLongShortTokenAmount
                  openInterestForShortLongTokenAmount
                  openInterestForShortShortTokenAmount
                  shortFundingRate
                  timestamp
                  updateTime
                }
              }
            `,
          }),
        });

        const result = (await response.json()) as GraphQLResponse;

        if (!result.data?.fundingRateHourlies) {
          throw new Error('Invalid response format');
        }

        return result.data.fundingRateHourlies.map((item) => {
          return {
            id: `${item.id}-${item.timestamp}`,
            marketToken: new PublicKey(item.marketToken),
            longFundingRate: new BN(item.longFundingRate),
            shortFundingRate: new BN(item.shortFundingRate),
            // long: formatRatePercentage(new BN(item.longFundingRate), 4, { signed: false, percentages: false }),
            // short: formatRatePercentage(new BN(item.shortFundingRate), 4, { signed: false, percentages: false }),
            long: item.longFundingRate,
            short: item.shortFundingRate,
            timestamp: item.timestamp,
            updateTime: item.updateTime,
            timehhmm: dayjs.utc(item.timestamp).format('HH:mm'),
            timeformatted: dayjs.utc(item.timestamp).format('D MMM YYYY, HH:mm')
          };
        });
      } catch (error) {
        console.error('Error fetching market trades:', error);
        return [];
      }
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  return {
    fundingRate: data ?? [],
    isLoading,
  };
};
