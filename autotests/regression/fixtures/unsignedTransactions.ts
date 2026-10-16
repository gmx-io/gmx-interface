import { decodeFunctionData, encodeErrorResult, getAddress, toHex } from "viem";

import CustomErrors from "../../../sdk/src/abis/CustomErrors";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import GlvRouter from "../../../sdk/src/abis/GlvRouter";
import RewardRouter from "../../../sdk/src/abis/RewardRouter";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";

export type RpcRequest = { id: number | string; method: string; params?: unknown[] };

// Only for unsigned UI request inspection; this does not demonstrate on-chain simulation or settlement.
export function unsignedTransactionReview(chainId: ContractsChainId, account: string) {
  const calls: { method: string; to: string }[] = [];
  const exchangeRouter = getAddress(getContract(chainId, "ExchangeRouter"));
  const glvRouter = getAddress(getContract(chainId, "GlvRouter"));
  return {
    calls,
    respond(request: RpcRequest) {
      const tx = request.params?.[0] as { from?: string; to?: string; data?: string } | undefined;
      if (!tx?.from || !tx.to || !tx.data || getAddress(tx.from) !== account) return;
      const to = getAddress(tx.to);
      if (to === getAddress(getContract(chainId, "RewardRouter")) && request.method === "eth_estimateGas") {
        const call = decodeFunctionData({ abi: RewardRouter, data: tx.data });
        if (!["stakeGmx", "unstakeGmx", "handleRewards"].includes(call.functionName)) return;
        calls.push({ method: request.method, to });
        return { jsonrpc: "2.0", id: request.id, result: toHex(3_000_000n) };
      }
      if (
        chainId === 42161 &&
        to === getAddress(getContract(42161, "MultichainTransferRouter")) &&
        request.method === "eth_estimateGas"
      ) {
        calls.push({ method: request.method, to });
        return { jsonrpc: "2.0", id: request.id, result: toHex(3_000_000n) };
      }
      if (to !== exchangeRouter && to !== glvRouter) return;
      const root = decodeFunctionData({ abi: to === exchangeRouter ? ExchangeRouter : GlvRouter, data: tx.data });
      if (root.functionName !== "multicall") return;
      if (request.method === "eth_estimateGas") {
        calls.push({ method: request.method, to });
        return { jsonrpc: "2.0", id: request.id, result: toHex(3_000_000n) };
      }
      if (request.method !== "eth_call") return;
      const methods = root.args[0].map(
        (data) => decodeFunctionData({ abi: to === exchangeRouter ? ExchangeRouter : GlvRouter, data }).functionName
      );
      const simulation =
        to === exchangeRouter
          ? methods.includes("makeExternalCalls")
          : methods.some((method) => method.startsWith("simulateExecuteLatest"));
      if (!simulation) return;
      calls.push({ method: request.method, to });
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: 3,
          message: "execution reverted",
          data: encodeErrorResult({ abi: CustomErrors, errorName: "EndOfOracleSimulation" }),
        },
      };
    },
  };
}
