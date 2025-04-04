import { MAX_TIMEOUT, Multicall } from "ab/testMultichain/Multicall";
import { getAbFlags } from "config/ab";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { getCurrentRpcUrls } from "lib/rpc/bestRpcTracker";

import type { MulticallRequestConfig } from "./types";

export async function executeMulticallMainThread(chainId: number, request: MulticallRequestConfig<any>) {
  const multicall = await Multicall.getInstance(chainId, getAbFlags());
  const providerUrls = getCurrentRpcUrls(chainId);
  const isLargeAccount = getIsLargeAccount();

  return multicall?.call(providerUrls, request, MAX_TIMEOUT, isLargeAccount);
}
