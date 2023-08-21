import { gql } from "@apollo/client";
import { useFeesSummary } from "domain/stats";
import { BigNumber } from "ethers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

type FeesInfo = {
  weeklyFees: BigNumber;
  totalFees: BigNumber;
};

const query = gql`
  query feesInfo($lastTimestamp: Int!) {
    dailyFeeInfos: collectedMarketFeesInfos(first: 1000, where: { timestampGroup_gte: $lastTimestamp, period: "1d" }) {
      feeUsdForPool
      period
      timestampGroup
    }
    totalFeesInfos: collectedMarketFeesInfos(where: { period: "total" }) {
      feeUsdForPool
      period
    }
  }
`;

export default function useFeesInfo(chains: number[]) {
  const { data: feesSummaryByChain } = useFeesSummary();
  const lastUpdatedAt = feesSummaryByChain[chains[0]]?.lastUpdatedAt;

  async function fetchFeesInfo(chain: number) {
    try {
      const client = getSyntheticsGraphClient(chain);
      const { data } = await client!.query({
        query,
        variables: {
          lastTimestamp: lastUpdatedAt,
        },
        fetchPolicy: "no-cache",
      });

      const { dailyFeeInfos, totalFeesInfos } = data;

      const weeklyFees = dailyFeeInfos.reduce((acc, { feeUsdForPool }) => acc.add(feeUsdForPool), BigNumber.from(0));
      const totalFees = totalFeesInfos.reduce((acc, { feeUsdForPool }) => acc.add(feeUsdForPool), BigNumber.from(0));
      return {
        weeklyFees,
        totalFees,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chain}:`, error);
      return {
        weeklyFees: BigNumber.from(0),
        totalFees: BigNumber.from(0),
      };
    }
  }

  async function fetcher(timestamp: number) {
    if (!timestamp) return;
    try {
      const promises = chains.map(fetchFeesInfo);
      const results = await Promise.allSettled(promises);
      const fees = results
        .filter((result) => result.status === "fulfilled")
        .reduce((acc, result, index) => {
          const value = (result as PromiseFulfilledResult<FeesInfo>).value;
          acc[chains[index]] = value;
          return acc;
        }, {});
      return fees;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching feesInfo data:", error);
      return {};
    }
  }

  const { data: feesInfo } = useSWR(lastUpdatedAt, fetcher, {
    refreshInterval: 60000,
  });

  return feesInfo;
}
