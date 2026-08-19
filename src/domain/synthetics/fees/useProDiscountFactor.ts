import { useMemo } from "react";

import { getContract } from "config/contracts";
import { proDiscountFactorKey, proTraderTierKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

export function useProDiscountFactorRequest(
  chainId: ContractsChainId,
  account: string | undefined
): bigint | undefined {
  const { data: proTier } = useMulticall(chainId, "useProTraderTier", {
    key: account ? [account] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          proTraderTier: {
            methodName: "getUint",
            params: [proTraderTierKey(account!)],
          },
        },
      },
    }),
    parseResponse: (res) => res.data.dataStore.proTraderTier.returnValues[0] as bigint,
  });

  const { data: discountFactor } = useMulticall(chainId, "useProDiscountFactor", {
    key: proTier !== undefined && proTier > 0n ? [proTier.toString()] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          proDiscountFactor: {
            methodName: "getUint",
            params: [proDiscountFactorKey(proTier!)],
          },
        },
      },
    }),
    parseResponse: (res) => res.data.dataStore.proDiscountFactor.returnValues[0] as bigint,
  });

  return useMemo(() => {
    if (!account || proTier === undefined) {
      return undefined;
    }

    if (proTier === 0n) {
      return 0n;
    }

    return discountFactor;
  }, [account, proTier, discountFactor]);
}
