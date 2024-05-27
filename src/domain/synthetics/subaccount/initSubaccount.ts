import { Signer } from "ethers";
import { callContract } from "lib/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "./constants";
import { getSubaccountRouterContract } from "./getSubaccountContract";
import { SubaccountParams } from "./types";
import { BN_ZERO } from "lib/numbers";

export async function initSubaccount(
  chainId: number,
  signer: Signer,
  subaccountAddress: string,
  mainAccountAddress: string,
  isAccountActive: boolean,
  currentActionsCount: bigint | null,
  setPendingTxns: (txns: any[]) => void,
  { topUp, maxAllowedActions, maxAutoTopUpAmount, wntForAutoTopUps }: SubaccountParams
) {
  const subaccountRouter = getSubaccountRouterContract(chainId, signer);

  const multicall = [
    wntForAutoTopUps !== undefined &&
      wntForAutoTopUps !== null &&
      wntForAutoTopUps > 0 && { method: "sendWnt", params: [mainAccountAddress, wntForAutoTopUps] },
    topUp !== null &&
      topUp !== undefined &&
      topUp > 0 && { method: "sendNativeToken", params: [subaccountAddress, topUp] },
    !isAccountActive && { method: "addSubaccount", params: [subaccountAddress] },
    maxAllowedActions !== undefined &&
      maxAllowedActions !== null &&
      maxAllowedActions >= 0 && {
        method: "setMaxAllowedSubaccountActionCount",
        params: [subaccountAddress, SUBACCOUNT_ORDER_ACTION, maxAllowedActions + (currentActionsCount ?? 0n)],
      },
    maxAutoTopUpAmount !== undefined &&
      maxAutoTopUpAmount !== null &&
      maxAutoTopUpAmount >= 0 && {
        method: "setSubaccountAutoTopUpAmount",
        params: [subaccountAddress, maxAutoTopUpAmount],
      },
  ].filter(Boolean) as { method: string; params: any[] }[];

  const encodedPayload = multicall.map((call) =>
    subaccountRouter.interface.encodeFunctionData(call!.method, call!.params)
  );

  const value = (topUp ?? BN_ZERO) + (wntForAutoTopUps ?? BN_ZERO);

  return callContract(chainId, subaccountRouter, "multicall", [encodedPayload], {
    value,
    setPendingTxns,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}
