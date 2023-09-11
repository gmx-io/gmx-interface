import { plural, t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";

export type CancelOrderParams = {
  orderKeys: string[];
  setPendingTxns: (txns: any) => void;
};

export async function cancelOrdersTxn(chainId: number, signer: Signer, p: CancelOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const multicall = p.orderKeys.map((key) => exchangeRouter.interface.encodeFunctionData("cancelOrder", [key]));

  const count = p.orderKeys.length;

  const ordersText = plural(count, {
    one: "Order",
    other: "# Orders",
  });

  return callContract(chainId, exchangeRouter, "multicall", [multicall], {
    sentMsg: t`Canceling ${ordersText}`,
    successMsg: t`${ordersText} canceled`,
    failMsg: t`Failed to cancel ${ordersText}`,
    setPendingTxns: p.setPendingTxns,
  });
}
