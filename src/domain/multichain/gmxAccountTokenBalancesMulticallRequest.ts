import type { SettlementChainId } from "config/chains";
import { getContract } from "config/contracts";
import { multichainBalanceKey } from "config/dataStore";
import { getSettlementChainTradableTokenAddresses } from "config/markets";
import type { TokenBalancesData } from "domain/tokens";
import { MulticallRequestConfig, MulticallResult } from "lib/multicall";

export function buildGmxAccountTokenBalancesRequest(chainId: SettlementChainId, account: string) {
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
      abiId: "DataStore",
      contractAddress: getContract(chainId, "DataStore"),
      calls: erc20Calls,
    },
  };

  return request;
}

export function parseGmxAccountTokenBalancesData(
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
