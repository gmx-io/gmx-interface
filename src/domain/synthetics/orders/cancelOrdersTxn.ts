import { plural, t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { ReactNode } from "react";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";
import { isTwapOrder } from "sdk/utils/orders";

import { OrderParams } from "./types";

export type CancelOrderParams = {
  orders: OrderParams[];
  setPendingTxns: (txns: any) => void;
  detailsMsg?: ReactNode;
};

export async function cancelOrdersTxn(chainId: number, signer: Signer, p: CancelOrderParams) {
  const router = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  const orderKeys = p.orders.flatMap((o) => (isTwapOrder(o) ? o.orders.map((o) => o.key as string) : o.key));

  const multicall = createCancelEncodedPayload({ router, orderKeys });

  const count = p.orders.length;

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

export function createCancelEncodedPayload({
  router,
  orderKeys = [],
}: {
  router: ethers.Contract;
  orderKeys: (string | null)[];
}) {
  return orderKeys.filter(Boolean).map((orderKey) => router.interface.encodeFunctionData("cancelOrder", [orderKey]));
}
