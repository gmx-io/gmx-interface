import { getAbFlags } from "config/ab";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { getCurrentRpcUrls } from "lib/rpc/bestRpcTracker";

import { multicallDevtools } from "./_debug";
import { Multicall } from "./Multicall";
import type { MulticallRequestConfig } from "./types";

export async function executeMulticallMainThread(chainId: number, request: MulticallRequestConfig<any>) {
  const multicall = await Multicall.getInstance(chainId, getAbFlags());
  const providerUrls = getCurrentRpcUrls(chainId);
  const isLargeAccount = getIsLargeAccount();
  const debugState = multicallDevtools.getDebugState();

  return multicall?.call(providerUrls, request, isLargeAccount, debugState);
}
