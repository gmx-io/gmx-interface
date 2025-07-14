import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall";
import { getContract } from "sdk/configs/contracts";
import { REQUEST_EXPIRATION_TIME_KEY } from "sdk/configs/dataStore";

export type OracleSettingsData = {
  requestExpirationTime: bigint;
};

export const useOracleSettingsData = (): OracleSettingsData | undefined => {
  const { chainId } = useChainId();

  const { data } = useMulticall(chainId, "useOracleSettings", {
    key: [],

    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          requestExpirationTime: {
            methodName: "getUint",
            params: [REQUEST_EXPIRATION_TIME_KEY],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const results = res.data.dataStore;
      return {
        requestExpirationTime: results.requestExpirationTime.returnValues[0],
      };
    },
  });

  return data;
};
