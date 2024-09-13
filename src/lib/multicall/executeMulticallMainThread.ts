import { MAX_TIMEOUT, Multicall } from "./Multicall";
import type { MulticallRequestConfig } from "./types";
import { getAbFlags } from "config/ab";
import { getBestRpcUrl } from "lib/rpc/bestRpcTracker";
import { getFallbackRpcUrl } from "config/chains";

export async function executeMulticallMainThread(chainId: number, request: MulticallRequestConfig<any>) {
  const multicall = await Multicall.getInstance(chainId, getAbFlags());
  const providerUrls = {
    primary: getBestRpcUrl(chainId),
    fallback: getFallbackRpcUrl(chainId),
  };

  return multicall?.call(providerUrls, request, MAX_TIMEOUT);
}
