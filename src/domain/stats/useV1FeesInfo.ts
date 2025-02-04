import { gql } from "@apollo/client";
import useSWR from "swr";
import { getGmxGraphClient } from "lib/subgraph/clients";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { sumBigInts } from "lib/sumBigInts";
import { getWeekAgoTimestamp } from "./getWeekAgoTimestamp";
import { getCurrentEpochStartedTimestamp } from "./getCurrentEpochStartedTimestamp";

const feeStatsQuery = gql`
  query feesInfo($weekAgoTimestamp: Int!) {
    total: feeStat(id: "total") {
      marginAndLiquidation
      swap
      mint
      burn
    }
    daily: feeStats(where: { period: daily, id_gte: $weekAgoTimestamp }, orderBy: id, orderDirection: asc) {
      id
      marginAndLiquidation
      swap
      mint
      burn
    }
  }
`;

type V1FeesItem = {
  id: string;
  swap: string;
  marginAndLiquidation: string;
  mint: string;
  burn: string;
};

type FeeStatsData = {
  total: Omit<V1FeesItem, "id">;
  daily: V1FeesItem[];
};

export function useV1FeesInfo(chainId: number) {
  async function fetcher() {
    try {
      const client = getGmxGraphClient(chainId);
      const epochStartedTimestamp = getCurrentEpochStartedTimestamp();
      const weekAgoTimestamp = getWeekAgoTimestamp();

      const { data: feeStatsData } = await client!.query<FeeStatsData>({
        query: feeStatsQuery,
        variables: {
          epochStartedTimestamp,
          weekAgoTimestamp,
        },
        fetchPolicy: "no-cache",
      });

      const totalFees = sumBigInts(
        ...[
          feeStatsData.total.swap,
          feeStatsData.total.marginAndLiquidation,
          feeStatsData.total.mint,
          feeStatsData.total.burn,
        ].map(BigInt)
      );

      let epochFees = 0n;
      const weeklyFees = feeStatsData.daily.reduce((acc, h) => {
        let accumFees = sumBigInts(...[acc, h.swap, h.marginAndLiquidation, h.mint, h.burn].map(BigInt));

        const [timestamp] = h.id.split(":");
        if (Number(timestamp) >= epochStartedTimestamp) {
          epochFees = accumFees;
        }

        return accumFees;
      }, 0n);

      return { weeklyFees, epochFees, totalFees };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chainId}:`, error);

      return {
        weeklyFees: 0n,
        epochFees: 0n,
        totalFees: 0n,
      };
    }
  }

  const { data: feesInfo } = useSWR([`useV1FeesInfo`, chainId], fetcher, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return feesInfo;
}
