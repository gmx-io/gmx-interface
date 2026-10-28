import { getContract } from "config/contracts";
import { executeMulticall, useMulticall } from "lib/multicall";
import type { ContractCallConfig, MulticallRequestConfig, MulticallResult } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { signalUnstakeFeatureDisabledKey } from "sdk/configs/dataStore";

import type { RewardRouter } from "./rewardRouter";
import type { UnstakeRequest } from "./unstakeRequests";

export type UnstakeRequestsData = {
  requests: UnstakeRequest[];
  unstakeDelay: number;
  pendingAmount: bigint;
  executableAmount: bigint;
  maxRequests: number;
  isSignalPaused: boolean;
};

const REQUEST_CALL_PREFIX = "request:";

export function useUnstakeRequests(
  chainId: ContractsChainId,
  { rewardRouter, account }: { rewardRouter: RewardRouter | undefined; account: string | undefined }
) {
  const routerAddress = rewardRouter?.version === "v3" ? rewardRouter.address : undefined;

  const { data, mutate } = useMulticall<MulticallRequestConfig<any>, UnstakeRequestsData>(
    chainId,
    "useUnstakeRequests",
    {
      key: routerAddress && account ? [routerAddress, account] : null,
      request: async (requestChainId) => {
        const keysResult = await executeMulticall(
          requestChainId,
          {
            rewardRouter: {
              contractAddress: routerAddress!,
              abiId: "RewardRouterV3",
              calls: {
                requestKeys: { methodName: "unstakeRequestKeys", params: [account] },
              },
            },
          },
          "urgent",
          "useUnstakeRequestKeys"
        );

        const requestKeys = keysResult.data.rewardRouter?.requestKeys?.returnValues as string[] | undefined;

        if (!requestKeys) {
          throw new Error("unstakeRequestKeys request failed");
        }

        const requestCalls: Record<string, ContractCallConfig> = {};

        for (const requestKey of requestKeys) {
          requestCalls[`${REQUEST_CALL_PREFIX}${requestKey}`] = {
            methodName: "getUnstakeRequest",
            params: [requestKey],
          };
        }

        return {
          rewardRouter: {
            contractAddress: routerAddress!,
            abiId: "RewardRouterV3",
            calls: {
              unstakeDelay: { methodName: "unstakeDelay", params: [] },
              pendingAmount: { methodName: "pendingUnstakeAmount", params: [account] },
              executableAmount: { methodName: "executableUnstakeAmount", params: [account] },
              maxRequests: { methodName: "MAX_UNSTAKE_REQUESTS", params: [] },
              ...requestCalls,
            },
          },
          dataStore: {
            contractAddress: getContract(requestChainId, "DataStore"),
            abiId: "DataStore",
            calls: {
              isSignalPaused: { methodName: "getBool", params: [signalUnstakeFeatureDisabledKey(routerAddress!)] },
            },
          },
        } satisfies MulticallRequestConfig<any>;
      },
      parseResponse: parseUnstakeRequestsResponse,
    }
  );

  return { unstakeRequestsData: data, mutateUnstakeRequests: mutate };
}

function parseUnstakeRequestsResponse(result: MulticallResult<MulticallRequestConfig<any>>): UnstakeRequestsData {
  const routerData = result.data.rewardRouter;

  const requests: UnstakeRequest[] = Object.entries(routerData)
    .filter(([callKey]) => callKey.startsWith(REQUEST_CALL_PREFIX))
    .map(([callKey, callResult]) => {
      const request = callResult.returnValues as { amount: bigint; requestedAt: bigint };

      return {
        key: callKey.slice(REQUEST_CALL_PREFIX.length),
        amount: request.amount,
        requestedAt: Number(request.requestedAt),
      };
    })
    .filter((request) => request.amount > 0n)
    .sort((a, b) => a.requestedAt - b.requestedAt);

  return {
    requests,
    unstakeDelay: Number(routerData.unstakeDelay.returnValues[0]),
    pendingAmount: routerData.pendingAmount.returnValues[0],
    executableAmount: routerData.executableAmount.returnValues[0],
    maxRequests: Number(routerData.maxRequests.returnValues[0]),
    isSignalPaused: result.data.dataStore.isSignalPaused.returnValues[0],
  };
}
