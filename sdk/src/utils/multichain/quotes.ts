import { decodeFunctionResult, encodeFunctionData } from "viem";

import { abis } from "abis";
import type { IRpc } from "utils/rpc";

import type { SendParam } from "./sendParams";

export type QuoteSendResult = {
  nativeFee: bigint;
  lzTokenFee: bigint;
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
    data: result as `0x${string}`,
  });

  return {
    nativeFee: decoded.nativeFee,
    lzTokenFee: decoded.lzTokenFee,
  };
}

