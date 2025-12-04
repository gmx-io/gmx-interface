import { useMemo } from "react";

import { getContract } from "config/contracts";
import { getIsFlagEnabled } from "config/ab";
import { USE_OPEN_INTEREST_IN_TOKENS_FOR_BALANCE } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

export type MarketsConstants = {
  useOpenInterestInTokensForBalance: boolean;
};

export type MarketsConstantsResult = {
  data: MarketsConstants | undefined;
  error?: Error;
};

export function useMarketsConstantsRequest(chainId: ContractsChainId): MarketsConstantsResult {
  const isAbFlagEnabled = getIsFlagEnabled("useOpenInterestInTokensForBalance");

  const { data, error } = useMulticall(chainId, "useMarketsConstants", {
    key: [],

    refreshInterval: CONFIG_UPDATE_INTERVAL,

    request: {
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          useOpenInterestInTokensForBalance: {
            methodName: "getBool",
            params: [USE_OPEN_INTEREST_IN_TOKENS_FOR_BALANCE],
          },
        },
      },
    },
    parseResponse: (res) => {
      const onChainValue = res.data.dataStore.useOpenInterestInTokensForBalance.returnValues[0];
      return {
        useOpenInterestInTokensForBalance: onChainValue,
      };
    },
  });

  return useMemo(
    () => ({
      data: data
        ? {
            useOpenInterestInTokensForBalance: isAbFlagEnabled ? true : data.useOpenInterestInTokensForBalance,
          }
        : undefined,
      error,
    }),
    [data, error, isAbFlagEnabled]
  );
}
