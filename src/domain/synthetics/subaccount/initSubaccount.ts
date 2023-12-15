import { BigNumber, Signer } from "ethers";
import { callContract } from "lib/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "./constants";
import { OneClickTradingParams } from "./types";
import { t } from "@lingui/macro";
import { getSubaccountRouterContract } from "./getSubaccountContract";

const ZERO = BigNumber.from(0);

export async function initSubaccount(
  chainId: number,
  signer: Signer,
  subaccountAddress: string,
  mainAccountAddress: string,
  isAccountActive: boolean,
  currentActionsCount: BigNumber | null,
  setPendingTxns: (txns: any[]) => void,
  { topUp, maxAllowedActions, maxAutoTopUpAmount, wntForAutoTopUps }: OneClickTradingParams
) {
  const subaccountRouter = getSubaccountRouterContract(chainId, signer);

  const multicall = [
    wntForAutoTopUps && wntForAutoTopUps.gt(0) && { method: "sendWnt", params: [mainAccountAddress, wntForAutoTopUps] },
    topUp && topUp.gt(0) && { method: "sendNativeToken", params: [subaccountAddress, topUp] },
    !isAccountActive && { method: "addSubaccount", params: [subaccountAddress] },
    maxAllowedActions && {
      method: "setMaxAllowedSubaccountActionCount",
      params: [subaccountAddress, SUBACCOUNT_ORDER_ACTION, maxAllowedActions.add(currentActionsCount ?? 0)],
    },
    maxAutoTopUpAmount &&
      maxAutoTopUpAmount.gt(0) && {
        method: "setSubaccountAutoTopUpAmount",
        params: [subaccountAddress, maxAutoTopUpAmount],
      },
  ].filter(Boolean) as { method: string; params: any[] }[];

  const encodedPayload = multicall.map((call) =>
    subaccountRouter.interface.encodeFunctionData(call!.method, call!.params)
  );

  const value = (topUp ?? ZERO).add(wntForAutoTopUps ?? ZERO);

  return callContract(chainId, subaccountRouter, "multicall", [encodedPayload], {
    value,
    setPendingTxns,
    successMsg: isAccountActive ? t`Subacccount is updated` : t`Subacccount is activated`,
    sentMsg: isAccountActive ? t`Updating subaccount` : t`Activating subaccount`,
  });
}
