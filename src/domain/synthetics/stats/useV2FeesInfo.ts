import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSyntheticsGraphClient } from "lib/subgraph";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getWeekAgoTimestamp } from "domain/stats/getWeekAgoTimestamp";

const totalFeeQuery = gql`
  query totalFeesInfo {
    position: positionFeesInfoWithPeriod(id: "total") {
      totalBorrowingFeeUsd
      totalPositionFeeUsd
      totalLiquidationFeeUsd
    }
    swap: swapFeesInfoWithPeriod(id: "total") {
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

const weeklyFeeQuery = gql`
  query weeklyFeesInfo($epochStartedTimestamp: Int!) {
    position: positionFeesInfoWithPeriods(where: { id_gte: $epochStartedTimestamp, period: "1d" }) {
      totalBorrowingFeeUsd
      totalPositionFeeUsd
      totalLiquidationFeeUsd
    }

    swap: swapFeesInfoWithPeriods(where: { id_gte: $epochStartedTimestamp, period: "1d" }) {
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

export default function useV2FeesInfo(chainId: number) {
  async function fetcher() {
    try {
      const client = getSyntheticsGraphClient(chainId);
      const epochStartedTimestamp = getWeekAgoTimestamp();

      const { data: weeklyFeesInfo } = await client!.query({
        query: weeklyFeeQuery,
        variables: {
          epochStartedTimestamp,
        },
        fetchPolicy: "no-cache",
      });

      const { data: totalFeesInfo } = await client!.query({
        query: totalFeeQuery,
        fetchPolicy: "no-cache",
      });

      const totalPositionFees =
        BigInt(totalFeesInfo.position.totalBorrowingFeeUsd) + BigInt(totalFeesInfo.position.totalPositionFeeUsd);

      const totalSwapFees =
        BigInt(totalFeesInfo.swap.totalFeeReceiverUsd) + BigInt(totalFeesInfo.swap.totalFeeUsdForPool);

      const totalLiquidationFees = BigInt(totalFeesInfo.position.totalLiquidationFeeUsd);
      const weeklyPositionFees = weeklyFeesInfo.position.reduce((acc, fee) => {
        return acc + BigInt(fee.totalBorrowingFeeUsd) + BigInt(fee.totalPositionFeeUsd);
      }, 0n);

      const weeklySwapFees = weeklyFeesInfo.swap.reduce((acc, fee) => {
        return acc + BigInt(fee.totalFeeReceiverUsd) + BigInt(fee.totalFeeUsdForPool);
      }, 0n);

      const weeklyLiquidationFees = weeklyFeesInfo.position.reduce((acc, fee) => {
        return acc + BigInt(fee.totalLiquidationFeeUsd);
      }, 0n);

      return {
        weeklyFees: weeklyPositionFees + weeklySwapFees + weeklyLiquidationFees,
        totalFees: totalPositionFees + totalSwapFees + totalLiquidationFees,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chainId}:`, error);
      return {
        weeklyFees: 0n,
        totalFees: 0n,
      };
    }
  }

  const { data: feesInfo } = useSWR([`useV2FeesInfo-${chainId}`], fetcher, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
  });

  return feesInfo;
}
