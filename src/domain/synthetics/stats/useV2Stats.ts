// current v2
import { useMemo } from "react";

import type { ContractsChainId } from "sdk/configs/chains";

import useV2FeesInfo from "./useV2FeesInfo";
import { useMarketsInfoRequest } from "../markets";
import { getOpenInterestForBalance } from "../markets/utils";
import useUsers from "../stats/useUsers";
import useVolumeInfo from "../stats/useVolumeInfo";
import { useTokensDataRequest } from "../tokens";

// undefined means the source has not answered yet, which a dashboard total must not read as zero
type DashboardOverview = {
  totalGMLiquidity: bigint | undefined;
  totalLongPositionSizes: bigint | undefined;
  totalShortPositionSizes: bigint | undefined;
  openInterest: bigint | undefined;
  dailyVolume: bigint | undefined;
  totalVolume: bigint | undefined;
  weeklyFees: bigint | undefined;
  epochFees: bigint | undefined;
  totalFees: bigint | undefined;
  totalUsers: bigint | undefined;
};

function toBigInt(value: string | number | bigint | undefined | null): bigint | undefined {
  return value === undefined || value === null ? undefined : BigInt(value);
}

export default function useV2Stats(chainId: ContractsChainId): DashboardOverview {
  const volumeInfo = useVolumeInfo(chainId);
  const feesInfo = useV2FeesInfo(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const usersInfo = useUsers(chainId);

  const stats = useMemo(() => {
    const allMarkets = marketsInfoData
      ? Object.values(marketsInfoData).filter((market) => !market.isDisabled)
      : undefined;
    const totalLiquidity = allMarkets?.reduce((acc, market) => {
      return acc + BigInt(market.poolValueMax ?? 0);
    }, 0n);

    const totalLongInterestUsd = allMarkets?.reduce((acc, market) => {
      return acc + getOpenInterestForBalance(market, true);
    }, 0n);

    const totalShortInterestUsd = allMarkets?.reduce((acc, market) => {
      return acc + getOpenInterestForBalance(market, false);
    }, 0n);

    return {
      totalGMLiquidity: totalLiquidity,
      totalLongPositionSizes: totalLongInterestUsd,
      totalShortPositionSizes: totalShortInterestUsd,
      openInterest:
        totalLongInterestUsd !== undefined && totalShortInterestUsd !== undefined
          ? totalLongInterestUsd + totalShortInterestUsd
          : undefined,
      dailyVolume: toBigInt(volumeInfo?.dailyVolume),
      totalVolume: toBigInt(volumeInfo?.totalVolume),
      weeklyFees: toBigInt(feesInfo?.weeklyFees),
      epochFees: toBigInt(feesInfo?.epochFees),
      totalFees: toBigInt(feesInfo?.totalFees),
      totalUsers: toBigInt(usersInfo?.totalUsers),
    };
  }, [marketsInfoData, volumeInfo, feesInfo, usersInfo]);

  return stats;
}
