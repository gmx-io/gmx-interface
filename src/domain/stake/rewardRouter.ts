import { ContractRunner, ethers } from "ethers";

import { getContract } from "config/contracts";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";

export function getRewardRouterContract(chainId: ContractsChainId, runner: ContractRunner | undefined) {
  return new ethers.Contract(getContract(chainId, "RewardRouterV3"), abis.RewardRouterV3, runner);
}
