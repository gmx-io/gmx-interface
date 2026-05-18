import { useMemo, useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { type ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useStakingPowerData } from "domain/stake/useStakingPowerData";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import { StakeModal, type StakeModalTabConfig } from "./StakeModal";

export function GmxStakeModal({
  isVisible,
  setIsVisible,
  chainId,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: ContractsChainId;
}) {
  const { signer, account } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { data: processedData } = useStakingProcessedData(chainId);
  const { stakingPowerData } = useStakingPowerData(chainId, { account, enabled: isVisible });

  const [gmxStakeValue, setGmxStakeValue] = useState("");
  const [gmxUnstakeValue, setGmxUnstakeValue] = useState("");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");
  const gmxAddress = getContract(chainId, "GMX");

  const { data: sbfGmxBalance } = useSWR<bigint>(
    isVisible && feeGmxTrackerAddress !== zeroAddress
      ? [
          `PointsPage:sbfGmxBalance:${account ?? PLACEHOLDER_ACCOUNT}`,
          chainId,
          feeGmxTrackerAddress,
          "balanceOf",
          account ?? PLACEHOLDER_ACCOUNT,
        ]
      : null,
    { fetcher: contractFetcher(undefined, "Token") as any }
  );

  const reservedAmount = useMemo(() => {
    if (sbfGmxBalance === undefined) return 0n;
    const stakedTotal = (processedData?.gmxInStakedGmx ?? 0n) + (processedData?.esGmxInStakedGmx ?? 0n);
    const reserved = stakedTotal - sbfGmxBalance;
    return reserved > 0n ? reserved : 0n;
  }, [processedData?.esGmxInStakedGmx, processedData?.gmxInStakedGmx, sbfGmxBalance]);

  const gmxMaxUnstakeAmount = useMemo(() => {
    const stakedAmount = processedData?.gmxInStakedGmx;
    if (stakedAmount === undefined) return undefined;
    if (sbfGmxBalance === undefined) return stakedAmount;
    return stakedAmount < sbfGmxBalance ? stakedAmount : sbfGmxBalance;
  }, [sbfGmxBalance, processedData?.gmxInStakedGmx]);

  const gmxStakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: processedData?.gmxBalance, value: gmxStakeValue, setValue: setGmxStakeValue }),
    [processedData?.gmxBalance, gmxStakeValue]
  );

  const gmxUnstakeConfig: StakeModalTabConfig = useMemo(
    () => ({ maxAmount: gmxMaxUnstakeAmount, value: gmxUnstakeValue, setValue: setGmxUnstakeValue }),
    [gmxMaxUnstakeAmount, gmxUnstakeValue]
  );

  return (
    <StakeModal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      chainId={chainId}
      signer={signer}
      tokenSymbol="GMX"
      rewardRouterAddress={rewardRouterAddress}
      stakeTokenAddress={gmxAddress}
      stakeFarmAddress={stakedGmxTrackerAddress}
      reservedAmount={reservedAmount}
      stake={gmxStakeConfig}
      unstake={gmxUnstakeConfig}
      setPendingTxns={setPendingTxns}
      processedData={processedData}
      stakingPowerData={stakingPowerData}
    />
  );
}
