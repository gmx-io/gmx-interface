import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { mapValues } from "lodash";
import { useMulticall } from "lib/multicall";

export type Method = "getUint" | "getData";

export type DataStoreKeysParams<TKeys extends string> = {
  [key in TKeys]: string;
};

export type DataStoreResult<TKeys extends string> = {
  [key in TKeys]?: any;
};

export function useDataStoreKeys<TKeys extends string>(
  chainId: number,
  p: { keys: DataStoreKeysParams<TKeys>; method: Method }
): DataStoreResult<TKeys> | undefined {
  const { data } = useMulticall(chainId, "useDataStore", {
    key: Object.keys(p.keys).length > 0 ? [JSON.stringify(p.keys)] : null,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: mapValues(p.keys, (hash) => ({
          methodName: p.method,
          params: [hash],
        })),
      },
    }),
    parseResponse: (res) =>
      mapValues(res.dataStore, (keyResult) => keyResult.returnValues[0]) as DataStoreResult<TKeys>,
  });

  return data;
}
