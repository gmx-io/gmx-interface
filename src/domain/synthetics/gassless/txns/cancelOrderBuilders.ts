import { encodeFunctionData } from "viem";

import ExchangeRouterAbi from "sdk/abis/ExchangeRouter.json";

export function buildCancelOrderMulticallPayload({ orderKeys = [] }: { orderKeys: string[] }) {
  const multicall = orderKeys.filter(Boolean).map((orderKey) => ({
    method: "cancelOrder",
    params: [orderKey],
  }));

  const callData = multicall.map((call) =>
    encodeFunctionData({
      abi: ExchangeRouterAbi.abi,
      functionName: call.method,
      args: call.params,
    })
  );

  return {
    multicall,
    callData,
    value: 0n,
  };
}
