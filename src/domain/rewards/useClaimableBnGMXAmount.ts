import useSWR from "swr";

import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";
import RewardTracker from "abis/RewardTracker.json";
import { getContract } from "config/contracts";

export function useClaimableBnGMXAmount() {
  const { signer, active, account } = useWallet();
  const { chainId } = useChainId();
  const feeGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");

  const { data: claimableBnGMXAmount } = useSWR(
    [`claimableBnGMXAmount:${active}`, chainId, feeGmxTrackerAddress, "claimable", account],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  return claimableBnGMXAmount;
}
