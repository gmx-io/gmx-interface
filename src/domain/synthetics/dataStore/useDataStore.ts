import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { mapValues } from "lodash";
import { useMulticall } from "lib/multicall";

export type DataStoreValues<TKeys extends string> = {
  [key in TKeys]?: any;
};

export type Method = "getUint" | "getData";

export function useDataStore<TKeys extends string>(
  chainId: number,
  p: { requestKeys: { [key in TKeys]: string }; method: Method }
): DataStoreValues<TKeys> | undefined {
  const cacheKey = Object.keys(p.requestKeys).length > 0 && [JSON.stringify(p.requestKeys)];

  const { data } = useMulticall(chainId, "useDataStore", cacheKey, {
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: mapValues(p.requestKeys, (hash) => ({
          methodName: p.method,
          params: [hash],
        })),
      },
    }),
    parseResponse: (res) =>
      mapValues(res.dataStore, (keyResult) => keyResult.returnValues[0]) as DataStoreValues<TKeys>,
  });

  return data;
}
