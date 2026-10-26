import useSWR from "swr";

import type { ContractsChainId } from "sdk/configs/chains";

import { fetchRewardRouter } from "./rewardRouter";

export function useRewardRouter(chainId: ContractsChainId) {
  const { data, mutate } = useSWR(["useRewardRouter", chainId], () => fetchRewardRouter(chainId));

  return { rewardRouter: data, mutateRewardRouter: mutate };
}
