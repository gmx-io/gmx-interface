import { zeroAddress } from "viem";

import { UiSourceChain, getChainName } from "config/chains";
import { MULTICALLS_MAP, MULTI_CHAIN_SUPPORTED_TOKEN_MAP } from "domain/multichain/config";
import { executeMulticall } from "lib/multicall/executeMulticall";
import type { MulticallRequestConfig } from "lib/multicall/types";

export async function fetchMultichainTokenBalances(
  currentSettlementChainId: number,
  account: string,
  progressCallback?: (chainId: number, tokensChainData: Record<string, bigint>) => void
): Promise<Record<number, Record<string, bigint>>> {
  const requests: Promise<{
    chainId: number;
    tokensChainData: Record<string, bigint>;
  }>[] = [];

  const sourceChainMap = MULTI_CHAIN_SUPPORTED_TOKEN_MAP[currentSettlementChainId];

  const result: Record<number, Record<string, bigint>> = {};

  for (const sourceChainIdString in sourceChainMap) {
    const sourceChainId = parseInt(sourceChainIdString);
    const tokenAddresses = sourceChainMap[sourceChainId];

    const requestConfig: MulticallRequestConfig<
      Record<
        string,
        {
          calls: Record<"balanceOf", { methodName: "balanceOf" | "getEthBalance"; params: [string] | [] }>;
        }
      >
    > = {};

    for (const tokenAddress of tokenAddresses) {
      if (tokenAddress === zeroAddress) {
        requestConfig[tokenAddress] = {
          // TODO there might not be a multicall contract on the source chain
          contractAddress: MULTICALLS_MAP[sourceChainId as UiSourceChain],
          abiId: "Multicall",
          calls: {
            balanceOf: {
              methodName: "getEthBalance",
              params: [account],
            },
          },
        };
        continue;
      }

      requestConfig[tokenAddress] = {
        contractAddress: tokenAddress,
        abiId: "ERC20",
        calls: {
          balanceOf: {
            methodName: "balanceOf",
            params: [account],
          },
        },
      };
    }

    const request = executeMulticall(
      sourceChainId,
      requestConfig,
      // TODO pass priority from args
      "urgent",
      `fetchMultichainTokens-${getChainName(sourceChainId)}`
    ).then((res) => {
      const tokensChainData: Record<string, bigint> = {};
      for (const tokenAddress of tokenAddresses) {
        if (tokenAddress === zeroAddress) {
          const balance = res.data[tokenAddress].balanceOf.returnValues[0] ?? 0n;
          tokensChainData[tokenAddress] = balance;
          continue;
        }

        const balance = res.data[tokenAddress].balanceOf.returnValues[0] ?? 0n;
        tokensChainData[tokenAddress] = balance;
      }

      result[sourceChainId] = tokensChainData;
      progressCallback?.(sourceChainId, tokensChainData);
      return {
        chainId: sourceChainId,
        tokensChainData,
      };
    });

    requests.push(request);
  }

  await Promise.allSettled(requests);

  return result;
}
