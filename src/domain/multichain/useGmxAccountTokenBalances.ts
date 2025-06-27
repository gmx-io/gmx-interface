import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { multichainBalanceKey } from "config/dataStore";
import { getSettlementChainTradableTokenAddresses } from "config/markets";
import { isSettlementChain } from "config/multichain";
import type { BalancesDataResult } from "domain/synthetics/tokens";
import type { TokenBalancesData } from "domain/tokens";
import { CacheKey, MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import type { ContractsChainId, SettlementChainId } from "sdk/configs/chains";

function buildGmxAccountTokenBalancesRequest(chainId: SettlementChainId, key: CacheKey) {
  const [account] = key as [string];
  const tradableTokenAddresses: string[] = getSettlementChainTradableTokenAddresses(chainId);

  const erc20Calls = Object.fromEntries(
    tradableTokenAddresses.map((tokenAddress) => [
      tokenAddress,
      {
        methodName: "getUint",
        params: [multichainBalanceKey(account, tokenAddress)],
      },
    ])
  );

  const request: MulticallRequestConfig<
    Record<
      string,
      {
        calls: Record<string, { methodName: "getUint"; params: [string] }>;
      }
    >
  > = {
    DataStore: {
      abiId: "DataStoreArbitrumSepolia",
      contractAddress: getContract(chainId, "DataStore"),
      calls: erc20Calls,
    },
  };

  return request;
}

function parseGmxAccountTokenBalancesData(
  data: MulticallResult<
    MulticallRequestConfig<
      Record<
        string,
        {
          calls: Record<string, { methodName: "getUint"; params: [string] }>;
        }
      >
    >
  >
): TokenBalancesData {
  return Object.fromEntries(
    Object.entries(data.data.DataStore).map(([tokenAddress, callResult]) => [tokenAddress, callResult.returnValues[0]])
  );
}

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
    request: buildGmxAccountTokenBalancesRequest,
    parseResponse: parseGmxAccountTokenBalancesData,
  });

  return {
    balancesData: data,
    error,
  };
}
