import SubaccountRouter from "abis/SubaccountRouter.json";
import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "./constants";
import { OneClickTradingParams } from "./types";

// FIXME rename lol :)
export async function addSubaccount(
  chainId: number,
  signer: Signer,
  subaccountAddress: string,

  { initialTopUp, maxAllowedActions, maxAutoTopUpAmount, wethForAutoTopUps }: OneClickTradingParams
) {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);

  const multicall = [
    // FIXME
    { method: "sendWnt", params: [account, wethForAutoTopUps] },
    { method: "sendNativeToken", params: [subaccountAddress, initialTopUp] },
    { method: "addSubaccount", params: [subaccountAddress] },
    {
      method: "setMaxAllowedSubaccountActionCount",
      params: [subaccountAddress, SUBACCOUNT_ORDER_ACTION, maxAllowedActions],
    },
    { method: "setSubaccountAutoTopUpAmount", params: [subaccountAddress, maxAutoTopUpAmount] },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => subaccountRouter.interface.encodeFunctionData(call!.method, call!.params));

  return callContract(chainId, subaccountRouter, "multicall", [encodedPayload], {
    value: initialTopUp,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
