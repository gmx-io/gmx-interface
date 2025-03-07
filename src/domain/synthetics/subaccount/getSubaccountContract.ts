import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { abis } from "sdk/abis";

export function getSubaccountRouterContract(chainId: number, signer: Signer) {
  return new ethers.Contract(getContract(chainId, "SubaccountRouter"), abis.SubaccountRouter, signer);
}
