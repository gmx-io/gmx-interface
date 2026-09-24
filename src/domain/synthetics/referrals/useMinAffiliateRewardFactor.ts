import { getContract } from "config/contracts";
import { minAffiliateRewardFactorKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

export function useMinAffiliateRewardFactor(chainId: ContractsChainId, referralTier: number | undefined) {
  return useMulticall(chainId, "useMinAffiliateRewardFactor", {
    key: referralTier !== undefined ? [referralTier] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          minAffiliateRewardFactor: {
            methodName: "getUint",
            params: [minAffiliateRewardFactorKey(BigInt(referralTier!))],
          },
        },
      },
    }),
    parseResponse: (res) => res.data.dataStore.minAffiliateRewardFactor.returnValues[0] as bigint,
  });
}
