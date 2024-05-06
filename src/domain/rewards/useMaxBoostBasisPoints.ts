import useSWR from "swr";

import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";
import RewardRouter from "abis/RewardRouter.json";
import { getContract } from "config/contracts";

export function useMaxBoostBasicPoints() {
  const { signer, active } = useWallet();
  const { chainId } = useChainId();
  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: maxBoostPoints } = useSWR([active, chainId, rewardRouterAddress, "maxBoostBasisPoints"], {
    fetcher: contractFetcher(signer, RewardRouter),
  });

  return maxBoostPoints ?? 0n;
}
