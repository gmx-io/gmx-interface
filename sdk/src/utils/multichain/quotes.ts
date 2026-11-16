import { decodeFunctionResult, encodeFunctionData } from "viem";

import { abis } from "abis";
import type { IRpc } from "utils/rpc";

import type { SendParam } from "./sendParams";

export type QuoteSendResult = {
  nativeFee: bigint;
};

export async function quoteStargateSend(
  rpc: IRpc,
  params: { stargateAddress: string; sendParams: SendParam }
): Promise<QuoteSendResult> {
  const data = encodeFunctionData({
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [params.sendParams, false],
  });

  const result = await rpc.call({ to: params.stargateAddress, data });

  const decoded = decodeFunctionResult({
    abi: abis.IStargate,
    functionName: "quoteSend",
    data: result,
  });

  return {
    nativeFee: decoded.nativeFee,
  };
}
