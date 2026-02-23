import { plural, t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { ReactNode } from "react";
import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { isTwapOrder } from "sdk/utils/orders";

import { OrderParams } from "./types";

export type CancelOrderParams = {
  orders: OrderParams[];
  setPendingTxns: (txns: any) => void;
  detailsMsg?: ReactNode;
};

export async function cancelOrdersTxn(chainId: ContractsChainId, signer: Signer, p: CancelOrderParams) {
  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  const orderKeys = p.orders.flatMap((o) => (isTwapOrder(o) ? o.orders.map((o) => o.key as string) : o.key));

  const multicall = orderKeys.filter(Boolean).map((orderKey) =>
    encodeFunctionData({
      abi: abis.ExchangeRouter,
      functionName: "cancelOrder",
      args: [orderKey],
    })
  );

  const count = p.orders.length;

  const ordersText = plural(count, {
    one: "Order",
    other: "# Orders",
  });

  return callContract(chainId, router, "multicall", [multicall], {
    sentMsg: t`Canceling ${ordersText}...`,
    successMsg: t`${ordersText} canceled`,
    failMsg: t`${ordersText} cancellation failed`,
    setPendingTxns: p.setPendingTxns,
    detailsMsg: p.detailsMsg,
  });
}
