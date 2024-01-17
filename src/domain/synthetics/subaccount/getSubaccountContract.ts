import SubaccountRouter from "abis/SubaccountRouter.json";
import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";

export function getSubaccountRouterContract(chainId: number, signer: Signer) {
  return new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);
}
