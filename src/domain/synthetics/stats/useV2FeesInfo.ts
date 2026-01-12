import { gql } from "@apollo/client";
import useSWR from "swr";

import { getCurrentEpochStartedTimestamp } from "domain/stats";
import { getWeekAgoTimestamp } from "domain/stats/getWeekAgoTimestamp";
import { getSubsquidGraphClient } from "lib/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { PositionFeesInfoWithPeriod, SwapFeesInfoWithPeriod } from "sdk/types/subsquid";

const totalFeeQuery = gql`
  query totalFeesInfo {
    position: positionFeesInfoWithPeriodById(id: "total") {
      totalBorrowingFeeUsd
      totalPositionFeeUsd
      totalLiquidationFeeUsd
    }
    swap: swapFeesInfoWithPeriodById(id: "total") {
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

const weeklyFeeQuery = gql`
  query weeklyFeesInfo($weekAgoTimestamp: Int!) {
    position: positionFeesInfoWithPeriods(
      where: { timestamp_gte: $weekAgoTimestamp, period_eq: "1d" }
      orderBy: timestamp_ASC
      limit: 1000
    ) {
      timestamp
      totalBorrowingFeeUsd
      totalPositionFeeUsd
      totalLiquidationFeeUsd
    }

    swap: swapFeesInfoWithPeriods(
      where: { timestamp_gte: $weekAgoTimestamp, period_eq: "1d" }
      orderBy: timestamp_ASC
      limit: 1000
    ) {
      timestamp
      totalFeeReceiverUsd
      totalFeeUsdForPool
    }
  }
`;

type WeeklyFeesInfo = {
  position: Pick<
    PositionFeesInfoWithPeriod,
    "timestamp" | "totalBorrowingFeeUsd" | "totalPositionFeeUsd" | "totalLiquidationFeeUsd"
  >[];
  swap: Pick<SwapFeesInfoWithPeriod, "timestamp" | "totalFeeReceiverUsd" | "totalFeeUsdForPool">[];
};

function getSumFees(fees: WeeklyFeesInfo, epochStartedTimestamp: number) {
  let epochPositionFees = 0n;
  let epochSwapFees = 0n;
  let epochLiquidationFees = 0n;

  const weeklyPositionFees = fees.position.reduce((acc, fee) => {
    const timestamp = fee.timestamp;

    if (!timestamp) {
      console.warn("No timestamp found for PositionFeesInfoWithPeriod");
      return acc;
    }

    const increment = BigInt(fee.totalBorrowingFeeUsd) + BigInt(fee.totalPositionFeeUsd);

    if (timestamp >= epochStartedTimestamp) {
      epochPositionFees += increment;
    }

    return acc + increment;
  }, 0n);

  const weeklySwapFees = fees.swap.reduce((acc, fee) => {
    const timestamp = fee.timestamp;

    if (!timestamp) {
      console.warn("No timestamp found for SwapFeesInfoWithPeriod");
      return acc;
    }

    const increment = BigInt(fee.totalFeeReceiverUsd) + BigInt(fee.totalFeeUsdForPool);

    if (timestamp >= epochStartedTimestamp) {
      epochSwapFees += increment;
    }

    return acc + increment;
  }, 0n);

  const weeklyLiquidationFees = fees.position.reduce((acc, fee) => {
    const timestamp = fee.timestamp;

    if (!timestamp) {
      console.warn("No timestamp found for PositionFeesInfoWithPeriod");
      return acc;
    }

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
      const client = getSubsquidGraphClient(chainId);
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
