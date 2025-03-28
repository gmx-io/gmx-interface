import "lib/polyfills";
import "lib/monkeyPatching";

import { getChainName } from "config/chains";
import { executeMulticall } from "lib/multicall/executeMulticall";
import { MulticallRequestConfig } from "lib/multicall/types";
import { erc20Abi } from "viem";
import { MULTI_CHAIN_SUPPORTED_TOKEN_MAP } from "../../../context/GmxAccountContext/config";
import { EMPTY_OBJECT } from "lib/objects";

export async function fetchMultichainTokenBalances(
  currentSettlementChainId: number,
  account: string
): Promise<Record<number, Record<string, bigint>>> {
  const requests: Promise<{
    chainId: number;
    tokensChainData: Record<string, bigint>;
  }>[] = [];

  const sourceChainMap = MULTI_CHAIN_SUPPORTED_TOKEN_MAP[currentSettlementChainId];

  for (const sourceChainIdString in sourceChainMap) {
    const sourceChainId = parseInt(sourceChainIdString);
    const tokenAddresses = sourceChainMap[sourceChainId];

    const requestConfig: MulticallRequestConfig<
      Record<string, { calls: Record<"balanceOf", { methodName: "balanceOf"; params: [string] }> }>
    > = {};

    for (const tokenAddress of tokenAddresses) {
      requestConfig[tokenAddress] = {
        contractAddress: tokenAddress,
        abi: erc20Abi,
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
      "background",
      `fetchMultichainTokens-${getChainName(sourceChainId)}`
    ).then(
      (res) => {
        const tokensChainData: Record<string, bigint> = {};

        for (const tokenAddress of tokenAddresses) {
          const balance = res.data[tokenAddress].balanceOf.returnValues[0] ?? 0n;
          tokensChainData[tokenAddress] = balance;
        }

        return {
          chainId: sourceChainId,
          tokensChainData,
        };
      },
      () => {
        return {
          chainId: sourceChainId,
          tokensChainData: EMPTY_OBJECT,
        };
      }
    );

    requests.push(request);
  }

  const result: Record<number, Record<string, bigint>> = {};

  for (const request of requests) {
    const { chainId, tokensChainData } = await request;

    result[chainId] = tokensChainData;
  }

  return result;
}
