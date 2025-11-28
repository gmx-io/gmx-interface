import pickBy from "lodash/pickBy";
import { zeroAddress } from "viem";

import { SettlementChainId, SourceChainId, getChainName } from "config/chains";
import {
  MULTICALLS_MAP,
  MULTI_CHAIN_DEPOSIT_TRADE_TOKENS,
  MULTI_CHAIN_TOKEN_MAPPING,
  MultichainTokenMapping,
} from "config/multichain";
import { executeMulticall } from "lib/multicall/executeMulticall";
import type { MulticallRequestConfig } from "lib/multicall/types";

export async function fetchMultichainTokenBalances({
  settlementChainId,
  account,
  progressCallback,
  tokens = MULTI_CHAIN_DEPOSIT_TRADE_TOKENS[settlementChainId],
  specificChainId,
}: {
  settlementChainId: SettlementChainId;
  account: string;
  progressCallback?: (chainId: number, tokensChainData: Record<string, bigint>) => void;
  tokens?: string[];
  specificChainId?: SourceChainId | undefined;
}): Promise<Record<number, Record<string, bigint>>> {
  const requests: Promise<void>[] = [];

  const sourceChainsTokenIdMap = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId];

  const result: Record<number, Record<string, bigint>> = {};

  for (const sourceChainIdString in sourceChainsTokenIdMap) {
    const sourceChainId = parseInt(sourceChainIdString) as SourceChainId;

    if (specificChainId && sourceChainId !== specificChainId) {
      continue;
    }

    const sourceChainTokenIdMap = tokens
      ? pickBy(sourceChainsTokenIdMap[sourceChainId], (value) => tokens.includes(value.settlementChainTokenAddress))
      : sourceChainsTokenIdMap[sourceChainId];

    if (Object.keys(sourceChainTokenIdMap).length === 0) {
      continue;
    }

    const request = fetchSourceChainTokenBalances({
      sourceChainId,
      account,
      sourceChainTokenIdMap,
    }).then((res) => {
      result[sourceChainId] = res;
      progressCallback?.(sourceChainId, res);
    });

    requests.push(request);
  }

  await Promise.allSettled(requests);

  return result;
}

export async function fetchSourceChainTokenBalances({
  sourceChainId,
  account,
  sourceChainTokenIdMap,
}: {
  sourceChainId: SourceChainId;
  account: string;
  // TODO MLTCH just pass string array of source chain token addresses
  sourceChainTokenIdMap: MultichainTokenMapping[SettlementChainId][SourceChainId];
}): Promise<Record<string, bigint>> {
  const tokenAddresses = Object.keys(sourceChainTokenIdMap ?? {});

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
        contractAddress: MULTICALLS_MAP[sourceChainId as SourceChainId],
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

    return tokensChainData;
  });

  return request;
}
