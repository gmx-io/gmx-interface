import { gql } from "@apollo/client";
import useSWR from "swr";

import { getCurrentEpochStartedTimestamp } from "domain/stats";
import { getWeekAgoTimestamp } from "domain/stats/getWeekAgoTimestamp";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

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
  query weeklyFeesInfo($weekAgoTimestamp: Int!) {
    position: positionFeesInfoWithPeriods(
      where: { id_gte: $weekAgoTimestamp, period: "1d" }
      orderBy: id
      orderDirection: asc
    ) {
      id
      totalBorrowingFeeUsd
      totalPositionFeeUsd
      totalLiquidationFeeUsd
    }

    swap: swapFeesInfoWithPeriods(
      where: { id_gte: $weekAgoTimestamp, period: "1d" }
      orderBy: id
      orderDirection: asc
    ) {
      id
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

type PositionFeesItem = {
  id: string;
  totalBorrowingFeeUsd: string;
  totalPositionFeeUsd: string;
  totalLiquidationFeeUsd: string;
};

type SwapFeesItem = {
  id: string;
  totalFeeReceiverUsd: string;
  totalFeeUsdForPool: string;
};

type WeeklyFeesInfo = {
  position: PositionFeesItem[];
  swap: SwapFeesItem[];
};

function getSumFees(fees: WeeklyFeesInfo, epochStartedTimestamp: number) {
  let epochPositionFees = 0n;
  let epochSwapFees = 0n;
  let epochLiquidationFees = 0n;

  const weeklyPositionFees = fees.position.reduce((acc, fee) => {
    const timestamp = Number(fee.id);

    const increment = BigInt(fee.totalBorrowingFeeUsd) + BigInt(fee.totalPositionFeeUsd);

    if (timestamp >= epochStartedTimestamp) {
      epochPositionFees += increment;
    }

    return acc + increment;
  }, 0n);

  const weeklySwapFees = fees.swap.reduce((acc, fee) => {
    const timestamp = Number(fee.id);

    const increment = BigInt(fee.totalFeeReceiverUsd) + BigInt(fee.totalFeeUsdForPool);

    if (timestamp >= epochStartedTimestamp) {
      epochSwapFees += increment;
    }

    return acc + increment;
  }, 0n);

  const weeklyLiquidationFees = fees.position.reduce((acc, fee) => {
    const timestamp = Number(fee.id);

    const increment = BigInt(fee.totalLiquidationFeeUsd);

    if (timestamp >= epochStartedTimestamp) {
      epochLiquidationFees += increment;
    }

    return acc + increment;
  }, 0n);

  const weeklyFees = weeklyPositionFees + weeklySwapFees + weeklyLiquidationFees;
  const epochFees = epochPositionFees + epochSwapFees + epochLiquidationFees;

  return {
    weeklyFees,
    epochFees,
  };
}

export default function useV2FeesInfo(chainId: number) {
  async function fetcher() {
    try {
      const client = getSyntheticsGraphClient(chainId);
      const epochStartedTimestamp = getCurrentEpochStartedTimestamp();
      const weekAgoTimestamp = getWeekAgoTimestamp();

      const [{ data: weeklyFeesInfo }, { data: totalFeesInfo }] = await Promise.all([
        client!.query<WeeklyFeesInfo>({
          query: weeklyFeeQuery,
          variables: {
            weekAgoTimestamp,
          },
          fetchPolicy: "no-cache",
        }),
        client!.query({
          query: totalFeeQuery,
          fetchPolicy: "no-cache",
        }),
      ]);

      const totalPositionFees =
        BigInt(totalFeesInfo.position.totalBorrowingFeeUsd) + BigInt(totalFeesInfo.position.totalPositionFeeUsd);

      const totalSwapFees =
        BigInt(totalFeesInfo.swap.totalFeeReceiverUsd) + BigInt(totalFeesInfo.swap.totalFeeUsdForPool);

      const totalLiquidationFees = BigInt(totalFeesInfo.position.totalLiquidationFeeUsd);

      const { weeklyFees, epochFees } = getSumFees(weeklyFeesInfo, epochStartedTimestamp);

      return {
        weeklyFees,
        epochFees,
        totalFees: totalPositionFees + totalSwapFees + totalLiquidationFees,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching feesInfo data for chain ${chainId}:`, error);
      return {
        epochFees: 0n,
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
