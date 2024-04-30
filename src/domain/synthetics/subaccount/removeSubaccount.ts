import { BigNumber, Signer } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "./getSubaccountContract";

export async function removeSubaccount(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = getSubaccountRouterContract(chainId, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: BigInt(0),
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
