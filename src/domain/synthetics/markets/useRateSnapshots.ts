import { gql } from "@apollo/client";
import useSWR from "swr";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSubsquidGraphClient } from "lib/indexers";
import { MarketRates, RatesSnapshot } from "sdk/utils/rates/types";

export type RateTimeframe = "1d" | "7d" | "30d";

const TIMEFRAME_TO_SECONDS: Record<RateTimeframe, number> = {
  "1d": 86400,
  "7d": 86400 * 7,
  "30d": 86400 * 30,
};

const TIMEFRAME_TO_AVERAGE_BY: Record<RateTimeframe, string | undefined> = {
  "1d": undefined,
  "7d": "1d",
  "30d": "1d",
};

const REFRESH_INTERVAL = 5 * 60 * 1000;

const MARKETS_NET_RATES_QUERY = gql`
  query MarketsNetRatesByPeriod(
    $periodStart: Float!
    $periodEnd: Float!
    $marketAddresses: [String!]
    $averageBy: String
  ) {
    marketsNetRatesByPeriod(
      where: {
        periodStart: $periodStart
        periodEnd: $periodEnd
        marketAddresses: $marketAddresses
        averageBy: $averageBy
      }
    ) {
      marketAddress
      ratesSnapshots {
        netRateLong
        netRateShort
        fundingRateLong
        fundingRateShort
        borrowingRateLong
        borrowingRateShort
        timestamp
      }
    }
  }
`;

export function useRateSnapshots({
  marketAddress,
  timeframe,
}: {
  marketAddress: string | undefined;
  timeframe: RateTimeframe;
}) {
  const chainId = useSelector(selectChainId);
  const client = getSubsquidGraphClient(chainId);

  const swrKey = client && marketAddress ? ["useRateSnapshots", chainId, marketAddress, timeframe] : null;

  const { data, isLoading, error } = useSWR<RatesSnapshot[] | undefined>(swrKey, {
    fetcher: async () => {
      if (!client || !marketAddress) return [];

      const periodEnd = Math.floor(Date.now() / 1000);
      const periodStart = periodEnd - TIMEFRAME_TO_SECONDS[timeframe];

      const response = await client.query<{ marketsNetRatesByPeriod: MarketRates[] }>({
        query: MARKETS_NET_RATES_QUERY,
        variables: {
          periodStart,
          periodEnd,
          marketAddresses: [marketAddress],
          averageBy: TIMEFRAME_TO_AVERAGE_BY[timeframe],
        },
        fetchPolicy: "no-cache",
      });

      const marketData = (response.data?.marketsNetRatesByPeriod ?? []).find(
        (r) => r.marketAddress.toLowerCase() === marketAddress.toLowerCase()
      );

      if (!marketData) return [];

      return [...marketData.ratesSnapshots].reverse();
    },
    refreshInterval: REFRESH_INTERVAL,
  });

  return {
    snapshots: data,
    isLoading,
    error,
  };
}
