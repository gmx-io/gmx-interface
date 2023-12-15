import { BigNumber, Signer } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "./getSubaccountContract";

export async function removeSubaccount(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = getSubaccountRouterContract(chainId, signer);

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
