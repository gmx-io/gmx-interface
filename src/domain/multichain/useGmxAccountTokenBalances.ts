import { useAccount } from "wagmi";

import { isSettlementChain } from "config/multichain";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
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

  const { resetTokensBalancesUpdates } = useTokensBalancesUpdates();

  const { data, error } = useMulticall(chainId as SettlementChainId, "useGmxAccountTokenBalances", {
    key: account && enabled && isSettlementChain(chainId) ? [account] : null,
    refreshInterval,
    request: (chainId, key) => buildGmxAccountTokenBalancesRequest(chainId, key?.[0] as string),
    parseResponse: (result) => {
      const parsedResult = parseGmxAccountTokenBalancesData(result);
      resetTokensBalancesUpdates(Object.keys(parsedResult), "gmxAccount");
      return parsedResult;
    },
  });

  const balancesData = useUpdatedTokensBalances(data, "gmxAccount");

  return {
    balancesData,
    error,
  };
}
