import { useMemo } from "react";

import { useGmxPrice } from "domain/legacy";
import { useStakingPowerData } from "domain/stake/useStakingPowerData";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";
import { bigMath } from "sdk/utils/bigmath";

export function useTreasuryProjection(chainId: ContractsChainId) {
  const { account } = useWallet();
  const { gmxPrice } = useGmxPrice();
  const { stakingPowerData, isLoading } = useStakingPowerData(chainId, { account });

  const projectedRewardGmx = useMemo((): bigint | undefined => {
    if (!stakingPowerData) {
      return undefined;
    }

    if (stakingPowerData.treasuryGmxBalance === null) {
      return undefined;
    }

    if (stakingPowerData.projectedRewardShare !== null) {
      return stakingPowerData.projectedRewardShare;
    }

    if (stakingPowerData.totalNetworkPower === 0n) {
      return 0n;
    }

    return undefined;
  }, [stakingPowerData]);

  const projectedRewardUsd = useMemo(() => {
    if (projectedRewardGmx === undefined || gmxPrice === undefined) {
      return undefined;
    }

    return bigMath.mulDiv(projectedRewardGmx, gmxPrice, expandDecimals(1, 18));
  }, [projectedRewardGmx, gmxPrice]);

  return {
    stakingPowerData,
    gmxPrice,
    projectedRewardGmx,
    projectedRewardUsd,
    isTreasuryAccumulating: stakingPowerData?.treasuryGmxBalance === null,
    isLoading,
  };
}
