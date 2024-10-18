import { gql } from "@apollo/client";
import useSWR from "swr";
import { getGmxGraphClient } from "lib/subgraph/clients";
import { getCurrentEpochStartedTimestamp } from "domain/stats";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { sumBigInts } from "lib/sumBigInts";

const feeStatsQuery = gql`
  query feesInfo($epochStartedTimestamp: Int!) {
    total: feeStat(id: "total") {
      margin
      swap
      liquidation
      mint
      burn
    }
    daily: feeStats(where: { period: daily, id_gte: $epochStartedTimestamp }) {
      id
      margin
      swap
      liquidation
      mint
      burn
    }
  }
`;

type FeeStatsData = {
  total: {
    margin: string;
    swap: string;
    liquidation: string;
    mint: string;
    burn: string;
  };
  daily: {
    id: string;
    margin: string;
    swap: string;
    liquidation: string;
    mint: string;
    burn: string;
  }[];
};

export function useV1FeesInfo(chainId: number) {
  async function fetcher() {
    try {
      const client = getGmxGraphClient(chainId);
      const epochStartedTimestamp = getCurrentEpochStartedTimestamp();

      const { data: feeStatsData } = await client!.query<FeeStatsData>({
        query: feeStatsQuery,
        variables: {
          epochStartedTimestamp,
        },
        fetchPolicy: "no-cache",
      });

      const totalFees = sumBigInts(
        ...[
          feeStatsData.total.margin,
          feeStatsData.total.swap,
          feeStatsData.total.liquidation,
          feeStatsData.total.mint,
          feeStatsData.total.burn,
        ].map(BigInt)
      );

      const weeklyFees = feeStatsData.daily.reduce((acc, h) => {
        return sumBigInts(...[acc, h.margin, h.swap, h.liquidation, h.mint, h.burn].map(BigInt));
      }, 0n);

      return { weeklyFees, totalFees };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chainId}:`, error);

      return {
        weeklyFees: 0n,
        totalFees: 0n,
      };
    }
  }

  const { data: feesInfo } = useSWR([`useV1FeesInfo`, chainId], fetcher, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return feesInfo;
}
