import { MAX_TIMEOUT, Multicall } from "./Multicall";
import type { MulticallRequestConfig } from "./types";
import { getAbFlags } from "config/ab";
import { getBestRpc } from "lib/rpc/bestRpcTracker";

export async function executeMulticallMainThread(chainId: number, request: MulticallRequestConfig<any>) {
  const multicall = await Multicall.getInstance(chainId, getAbFlags());

  return multicall?.call(getBestRpc(chainId), request, MAX_TIMEOUT);
}
