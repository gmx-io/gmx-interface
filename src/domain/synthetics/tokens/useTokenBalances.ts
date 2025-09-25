import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { Token } from "domain/tokens";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { CacheKey, MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getToken, getV2Tokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import type { BalancesDataResult, TokenBalancesData } from "./types";

function buildTokenBalancesRequest(chainId: ContractsChainId, key: CacheKey) {
  const [account, overrideTokenList] = key as [account: string, overrideTokenList: string[] | undefined];

  let tokenList: Token[];
  if (overrideTokenList && overrideTokenList.length > 0) {
    tokenList = overrideTokenList.map((address) => getToken(chainId, address));
  } else {
    tokenList = getV2Tokens(chainId);
  }

  return tokenList.reduce((acc, token) => {
    if (token.isSynthetic) return acc;

    const address = token.address;

    if (address === NATIVE_TOKEN_ADDRESS) {
      acc[address] = {
        contractAddress: getContract(chainId as ContractsChainId, "Multicall"),
        abiId: "Multicall",
        calls: {
          balance: {
            methodName: "getEthBalance",
            params: [account],
          },
        },
      };
    } else {
      acc[address] = {
        contractAddress: address,
        abiId: "Token",
        calls: {
          balance: {
            methodName: "balanceOf",
            params: [account ?? PLACEHOLDER_ACCOUNT],
          },
        },
      };
    }

    return acc;
  }, {} as MulticallRequestConfig<any>);
}

export function useTokenBalances(
  chainId: ContractsChainId,
  params?: {
    overrideAccount?: string | undefined;
    overrideTokenList?: {
      address: string;
      isSynthetic?: boolean;
    }[];
    refreshInterval?: number;
    enabled?: boolean;
  }
): BalancesDataResult {
  const { overrideAccount, overrideTokenList, refreshInterval, enabled = true } = params ?? {};

  const { resetTokensBalancesUpdates } = useTokensBalancesUpdates();

  const { address: currentAccount } = useAccount();

  const account = overrideAccount ?? currentAccount;

  const { data, error } = useMulticall(chainId, "useTokenBalances", {
    key: account && enabled ? [account, overrideTokenList?.map((t) => t.address)] : null,
    refreshInterval,
    request: buildTokenBalancesRequest,
    parseResponse: (res) => {
      let result: TokenBalancesData = {};

      Object.keys(res.data).forEach((tokenAddress) => {
        result[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];
      });

      resetTokensBalancesUpdates(Object.keys(result), "wallet");

      return result;
    },
  });

  const balancesData = useUpdatedTokensBalances(data, "wallet");

  return {
    balancesData,
    error,
  };
}
