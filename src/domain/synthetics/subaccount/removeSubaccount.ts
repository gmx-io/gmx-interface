import { Signer } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "./getSubaccountContract";

export async function removeSubaccount(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = getSubaccountRouterContract(chainId, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
