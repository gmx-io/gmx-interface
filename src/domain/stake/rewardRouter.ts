import { ContractRunner, ethers } from "ethers";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";

export type RewardRouterVersion = "v2" | "v3";

export type RewardRouter = {
  address: string;
  version: RewardRouterVersion;
};

export async function fetchRewardRouter(chainId: ContractsChainId): Promise<RewardRouter> {
  const v2Router: RewardRouter = { address: getContract(chainId, "RewardRouter"), version: "v2" };
  const v3Address = getContract(chainId, "RewardRouterV3");

  if (v3Address === zeroAddress) {
    return v2Router;
  }

  const isV3Active = await getPublicClientWithRpc(chainId).readContract({
    address: getContract(chainId, "StakedGmxTracker"),
    abi: abis.RewardTracker,
    functionName: "isHandler",
    args: [v3Address],
  });

  return isV3Active ? { address: v3Address, version: "v3" } : v2Router;
}

export async function getIsRewardRouterChanged(chainId: ContractsChainId, rewardRouter: RewardRouter) {
  const actualRewardRouter = await fetchRewardRouter(chainId);

  return actualRewardRouter.version !== rewardRouter.version;
}

export function getRewardRouterContract(rewardRouter: RewardRouter, runner: ContractRunner | undefined) {
  const abi = rewardRouter.version === "v3" ? abis.RewardRouterV3 : abis.RewardRouter;

  return new ethers.Contract(rewardRouter.address, abi, runner);
}
