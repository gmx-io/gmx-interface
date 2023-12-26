import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { SUBACCOUNT_ORDER_ACTION, subaccountActionCountKey } from "config/dataStore";
import { BigNumber, Signer } from "ethers";
import { executeMulticall } from "lib/multicall";

export async function getCurrentMaxActionsCount({
  account,
  subaccount,
  chainId,
  signer,
}: {
  account: string;
  subaccount: string;
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
          params: [subaccountActionCountKey(account, subaccount, SUBACCOUNT_ORDER_ACTION)],
        },
      },
    },
  });
  if (response) {
    return BigNumber.from(response.data.dataStore.currentActionsCount.returnValues[0]);
  }

  return null;
}
