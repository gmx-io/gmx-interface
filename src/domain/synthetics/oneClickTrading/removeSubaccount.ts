import SubaccountRouter from "abis/SubaccountRouter.json";
import { getContract } from "config/contracts";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";

export async function removeSubaccount(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);

  const multicall = [{ method: "removeSubaccount", params: [subaccountAddress] }];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => subaccountRouter.interface.encodeFunctionData(call!.method, call!.params));

  return callContract(chainId, subaccountRouter, "multicall", [encodedPayload], {
    value: BigNumber.from(0),
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
