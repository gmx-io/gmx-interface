import { getAbFlags } from "config/ab";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { getCurrentRpcUrls } from "lib/rpc/useRpcUrls";

import { _debugMulticall } from "./_debug";
import { Multicall } from "./Multicall";
import type { MulticallRequestConfig } from "./types";

export async function executeMulticallMainThread(chainId: number, request: MulticallRequestConfig<any>) {
  const multicall = await Multicall.getInstance(chainId, getAbFlags());
  const providerUrls = getCurrentRpcUrls(chainId);
  const isLargeAccount = getIsLargeAccount();
  const debugState = _debugMulticall?.getDebugState();

  return multicall?.call(providerUrls as any, request, isLargeAccount, debugState);
}
