import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { SUBACCOUNT_ORDER_ACTION, subaccountActionCountKey } from "config/dataStore";
import { Signer } from "ethers";
import { executeMulticall } from "lib/multicall";

export async function getCurrentMaxActionsCount({
  accountAddress,
  subaccountAddress,
  chainId,
  signer,
}: {
  accountAddress: string;
  subaccountAddress: string;
  chainId: number;
  signer: Signer;
}) {
  const response = await executeMulticall(chainId, signer, {
    dataStore: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: DataStore.abi,
      calls: {
        currentActionsCount: {
          methodName: "getUint",
          params: [subaccountActionCountKey(accountAddress, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
        },
      },
    },
  });
  if (response) {
    return BigInt(response.data.dataStore.currentActionsCount.returnValues[0]);
  }

  return null;
}
