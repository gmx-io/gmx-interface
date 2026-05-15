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

export type QuoteOftResult = {
  amountSentLD: bigint;
  amountReceivedLD: bigint;
};

export async function quoteStargateOft(
  rpc: IRpc,
  params: { stargateAddress: string; sendParams: SendParam }
): Promise<QuoteOftResult> {
  const data = encodeFunctionData({
    abi: abis.IStargate,
    functionName: "quoteOFT",
    args: [params.sendParams],
  });

  const result = await rpc.call({ to: params.stargateAddress, data });

  const decoded = decodeFunctionResult({
    abi: abis.IStargate,
    functionName: "quoteOFT",
    data: result as `0x${string}`,
  });

  return {
    amountSentLD: decoded[2].amountSentLD,
    amountReceivedLD: decoded[2].amountReceivedLD,
  };
}
