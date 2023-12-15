import { plural, t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";

export type CancelOrderParams = {
  orderKeys: string[];
  subaccount: Subaccount;
  isLastSubaccountAction: boolean;
  setPendingTxns: (txns: any) => void;
};

export async function cancelOrdersTxn(chainId: number, signer: Signer, p: CancelOrderParams) {
  const router = p.subaccount
    ? getSubaccountRouterContract(chainId, p.subaccount.signer)
    : new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const multicall = p.orderKeys.map((key) => router.interface.encodeFunctionData("cancelOrder", [key]));

  const count = p.orderKeys.length;

  const ordersText = plural(count, {
    one: "Order",
    other: "# Orders",
  });

  let subaccountNote = "";
  if (p.subaccount && p.isLastSubaccountAction) {
    subaccountNote = t`. Subaccount max actions count reached.`;
  }

  return callContract(chainId, router, "multicall", [multicall], {
    sentMsg: t`Cancelling ${ordersText}${subaccountNote}`,
    successMsg: t`${ordersText} cancelled${subaccountNote}`,
    failMsg: t`Failed to cancel ${ordersText}${subaccountNote}`,
    setPendingTxns: p.setPendingTxns,
  });
}
