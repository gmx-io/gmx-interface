import { getContract } from "config/contracts";
import { uiFeeFactorKey } from "config/dataStore";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useMulticall } from "lib/multicall";
import { BN_ZERO } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import DataStore from "abis/DataStore.json";

export default function useUiFeeFactor(chainId: number) {
  const account = UI_FEE_RECEIVER_ACCOUNT;
  const { data: uiFeeFactorForAccount } = useMulticall(chainId, "uiFeeFactorForAccount", {
    key: account ? [account] : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          keys: {
            methodName: "getUint",
            params: [uiFeeFactorKey(account!)],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return BigInt(res.data.dataStore.keys.returnValues[0]);
    },
  });

  return uiFeeFactorForAccount ?? BN_ZERO;
}
