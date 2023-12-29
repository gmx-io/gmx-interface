import { plural, t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { ReactNode } from "react";

export type CancelOrderParams = {
  orderKeys: string[];
  subaccount: Subaccount;
  isLastSubaccountAction: boolean;
  setPendingTxns: (txns: any) => void;
  detailsMsg?: ReactNode;
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

  return callContract(chainId, router, "multicall", [multicall], {
    sentMsg: t`Cancelling ${ordersText}`,
    successMsg: t`${ordersText} cancelled`,
    failMsg: t`Failed to cancel ${ordersText}`,
    setPendingTxns: p.setPendingTxns,
    detailsMsg: p.detailsMsg,
  });
}
