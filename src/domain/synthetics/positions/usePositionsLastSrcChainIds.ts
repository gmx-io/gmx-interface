import { useMemo } from "react";

import { getContract } from "config/contracts";
import { positionLastSrcChainIdKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import type { ContractCallConfig } from "lib/multicall";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId } from "sdk/configs/chains";

import type { PositionsInfoData } from "./types";

export type PositionsLastSrcChainIds = {
  [contractPositionKey: string]: bigint;
};

export function usePositionsLastSrcChainIds(
  chainId: ContractsChainId,
  positionsInfoData: PositionsInfoData | undefined
): PositionsLastSrcChainIds | undefined {
  const contractKeysKey = useMemo(
    () =>
      positionsInfoData
        ? Object.values(positionsInfoData)
            .map((position) => position.contractKey)
            .sort()
            .join(",")
        : "",
    [positionsInfoData]
  );

  const { data } = useMulticall(chainId, "usePositionsLastSrcChainIds", {
    key: contractKeysKey ? [contractKeysKey] : null,
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    keepPreviousData: true,
    request: (requestChainId, key) => {
      const calls: Record<string, ContractCallConfig> = {};

      for (const contractKey of String((key as string[])[0]).split(",")) {
        calls[contractKey] = {
          methodName: "getUint",
          params: [positionLastSrcChainIdKey(contractKey)],
        };
      }

      return {
        dataStore: {
          contractAddress: getContract(requestChainId, "DataStore"),
          abiId: "DataStore",
          calls,
        },
      };
    },
    parseResponse: (res) => {
      const result: PositionsLastSrcChainIds = {};

      for (const [contractKey, call] of Object.entries(res.data.dataStore)) {
        result[contractKey] = BigInt(call.returnValues[0]);
      }

      return result;
    },
  });

  return data;
}

export function withPositionsLastSrcChainIds(
  positionsInfoData: PositionsInfoData | undefined,
  lastSrcChainIds: PositionsLastSrcChainIds | undefined
): PositionsInfoData | undefined {
  if (!positionsInfoData || !lastSrcChainIds) {
    return positionsInfoData;
  }

  const result: PositionsInfoData = {};

  for (const [key, position] of Object.entries(positionsInfoData)) {
    const lastSrcChainId = lastSrcChainIds[position.contractKey];
    result[key] = lastSrcChainId === undefined ? position : { ...position, lastSrcChainId };
  }

  return result;
}
