import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import { useMulticall } from "lib/multicall";
import { uiFeeFactorKey } from "config/dataStore";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { BN_ZERO } from "lib/numbers";

export default function useUiFeeFactor(chainId: number) {
  const account = UI_FEE_RECEIVER_ACCOUNT;
  const { data: uiFeeFactorForAccount } = useMulticall(chainId, "uiFeeFactorForAccount", {
    key: account ? [account] : null,
    refreshInterval: 60000,
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
