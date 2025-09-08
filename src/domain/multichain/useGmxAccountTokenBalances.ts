import { useAccount } from "wagmi";

import { isSettlementChain } from "config/multichain";
import type { BalancesDataResult } from "domain/synthetics/tokens";
import { useMulticall } from "lib/multicall";
import type { ContractsChainId, SettlementChainId } from "sdk/configs/chains";

import {
  buildGmxAccountTokenBalancesRequest,
  parseGmxAccountTokenBalancesData,
} from "./gmxAccountTokenBalancesMulticallRequest";

export function useGmxAccountTokenBalances(
  chainId: ContractsChainId,
  params?: {
    enabled?: boolean;
    refreshInterval?: number;
  }
): BalancesDataResult {
  const { enabled = true, refreshInterval } = params ?? {};

  const { address: account } = useAccount();

  const { data, error } = useMulticall(chainId as SettlementChainId, "useGmxAccountTokenBalances", {
    key: account && enabled && isSettlementChain(chainId) ? [account] : null,
    refreshInterval,
    request: (chainId, key) => buildGmxAccountTokenBalancesRequest(chainId, key?.[0] as string),
    parseResponse: parseGmxAccountTokenBalancesData,
  });

  return {
    balancesData: data,
    error,
  };
}
