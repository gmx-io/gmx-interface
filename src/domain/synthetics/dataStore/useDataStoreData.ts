import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { mapValues } from "lodash";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";

export type DataStoreValues<TKeys extends string> = {
  [key in TKeys]?: any;
};

export type Method = "getUint" | "getData";

// TODO: better naming?
export function useDataStoreData<TKeys extends string>(
  chainId: number,
  p: { keys?: { [key in TKeys]: string }; method: Method }
): DataStoreValues<TKeys> {
  const keys = Object.values(p.keys || {}).join("-");

  const { data } = useMulticall(chainId, keys.length > 0 ? [keys] : null, {
    dataStore: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: DataStore.abi,
      calls: mapValues(p.keys, (hash) => ({
        methodName: p.method,
        params: [hash],
      })),
    },
  });

  const result: DataStoreValues<TKeys> = useMemo(() => {
    if (!data?.dataStore) return {};

    return mapValues(data.dataStore, (response) => response.returnValues[0]);
  }, [data]);

  return result;
}
