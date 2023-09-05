import { gql } from "@apollo/client";
import { useFeesSummary } from "domain/stats";
import { BigNumber } from "ethers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useSWR from "swr";

const totalFeeQuery = gql`
  query totalFeesInfo {
    position: positionFeesInfoWithPeriod(id: "total") {
      totalBorrowingFeeUsd
      totalPositionFeeUsd
    }
    swap: swapFeesInfoWithPeriod(id: "total") {
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

const weeklyFeeQuery = gql`
  query weeklyFeesInfo($lastTimestamp: Int!) {
    position: positionFeesInfoWithPeriods(where: { id_gte: $lastTimestamp, period: "1d" }) {
      totalBorrowingFeeUsd
      totalPositionFeeUsd
    }

    swap: swapFeesInfoWithPeriods(where: { id_gte: $lastTimestamp, period: "1d" }) {
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

export default function useFeesInfo(chainId: number) {
  const { data: feesSummaryByChain } = useFeesSummary();
  const lastUpdatedAt = feesSummaryByChain[chainId]?.lastUpdatedAt;

  async function fetchFeesInfo(chainId: number, lastFeesUpdatedTimestamp: number) {
    try {
      const client = getSyntheticsGraphClient(chainId);
      const { data: weeklyFeesInfo } = await client!.query({
        query: weeklyFeeQuery,
        variables: {
          lastTimestamp: lastFeesUpdatedTimestamp,
        },
        fetchPolicy: "no-cache",
      });

      const { data: totalFeesInfo } = await client!.query({
        query: totalFeeQuery,
        fetchPolicy: "no-cache",
      });

      const totalPositionFees = BigNumber.from(totalFeesInfo.position.totalBorrowingFeeUsd).add(
        totalFeesInfo.position.totalPositionFeeUsd
      );

      const totalSwapFees = BigNumber.from(totalFeesInfo.swap.totalFeeReceiverUsd).add(
        totalFeesInfo.swap.totalFeeUsdForPool
      );

      const weeklyPositionFees = weeklyFeesInfo.position.reduce((acc, fee) => {
        return acc.add(fee.totalBorrowingFeeUsd).add(fee.totalPositionFeeUsd);
      }, BigNumber.from(0));

      const weeklySwapFees = weeklyFeesInfo.swap.reduce((acc, fee) => {
        return acc.add(fee.totalFeeReceiverUsd).add(fee.totalFeeUsdForPool);
      }, BigNumber.from(0));

      return {
        weeklyFees: weeklyPositionFees.add(weeklySwapFees),
        totalFees: totalPositionFees.add(totalSwapFees),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chainId}:`, error);
      return {
        weeklyFees: BigNumber.from(0),
        totalFees: BigNumber.from(0),
      };
    }
  }

  async function fetcher(args) {
    const [, lastFeesUpdatedTimestamp] = args;
    if (!lastFeesUpdatedTimestamp) return;
    try {
      const { weeklyFees, totalFees } = await fetchFeesInfo(chainId, lastFeesUpdatedTimestamp);
      return {
        weeklyFees,
        totalFees,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching feesInfo data:", error);
      return {};
    }
  }

  const { data: feesInfo } = useSWR([`useFeesInfo-${chainId}`, lastUpdatedAt], fetcher, {
    refreshInterval: 60000,
  });

  return feesInfo;
}
