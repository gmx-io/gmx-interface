import { Abi, encodeFunctionData } from "viem";

import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "configs/contracts";

import type { GmxSdk } from "../../../index";

export type CancelOrderParams = {
  orderKeys: string[];
};

export async function cancelOrdersTxn(sdk: GmxSdk, p: CancelOrderParams) {
  const multicall = createCancelEncodedPayload(p.orderKeys);
  const exchangeRouter = getContract(sdk.chainId, "ExchangeRouter");
  return sdk.callContract(exchangeRouter, ExchangeRouter.abi as Abi, "multicall", [multicall]);
}

export function createCancelEncodedPayload(orderKeys: (string | null)[] = []) {
  return orderKeys.filter(Boolean).map((orderKey) =>
    encodeFunctionData({
      abi: ExchangeRouter.abi as Abi,
      functionName: "cancelOrder",
      args: [orderKey],
    })
  );
}
