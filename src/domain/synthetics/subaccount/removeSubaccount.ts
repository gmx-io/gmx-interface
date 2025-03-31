import { ethers, Signer } from "ethers";

import { callContract } from "lib/contracts";
import SubaccountRouter from "sdk/abis/SubaccountRouter.json";
import { getContract } from "sdk/configs/contracts";

export async function removeSubaccountTxn(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
