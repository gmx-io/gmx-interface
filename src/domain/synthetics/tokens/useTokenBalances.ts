import { useMemo } from "react";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { multichainBalanceKey } from "config/dataStore";
import { getSettlementChainTradableTokenAddresses } from "config/markets";
import { isSettlementChain } from "config/multichain";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { Token } from "domain/tokens";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { CacheKey, MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import type { AnyChainId, ContractsChainId, SettlementChainId } from "sdk/configs/chains";
import { getToken, getV2Tokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { TokenBalancesData } from "./types";

type BalancesDataResult = {
  balancesData?: TokenBalancesData;
  error?: Error;
};

function buildSettlementChainTokenBalancesRequest({
  chainId,
  account,
  tokenList,
}: {
  chainId: ContractsChainId;
  account: string;
  tokenList: Token[];
}) {
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

function buildGmxAccountTokenBalancesRequest({ chainId, account }: { chainId: SettlementChainId; account: string }) {
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

function buildTokenBalancesRequest(chainId: ContractsChainId, key: CacheKey) {
  const [account, isGmxAccount, overrideTokenList] = key as [
    account: string,
    isGmxAccount: boolean,
    overrideTokenList: string[] | undefined,
  ];

  let tokenList: Token[];
  if (overrideTokenList && overrideTokenList.length > 0) {
    tokenList = overrideTokenList.map((address) => getToken(chainId, address));
  } else {
    tokenList = getV2Tokens(chainId);
  }

  if (isGmxAccount) {
    if (!isSettlementChain(chainId)) {
      throw new Error("Gmx account is only supported on settlement chains");
    }

    return buildGmxAccountTokenBalancesRequest({ chainId, account });
  }

  return buildSettlementChainTokenBalancesRequest({ chainId, account, tokenList });
}

function buildParseTokenBalancesResponse(resetTokensBalancesUpdates: (tokenAddresses: string[]) => void) {
  return function (res: MulticallResult<MulticallRequestConfig<any>>, chainId: AnyChainId, key: CacheKey) {
    const [, isGmxAccount] = key as [account: string, isGmxAccount: boolean, overrideTokenList: string[] | undefined];

    let result: TokenBalancesData = {};

    if (isGmxAccount) {
      result = parseGmxAccountTokenBalancesData(res);
    } else {
      Object.keys(res.data).forEach((tokenAddress) => {
        result[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];
      });
      // TODO MLTCH: decide on whether to use it in multichain
      resetTokensBalancesUpdates(Object.keys(result));
    }

    return result;
  };
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
    isGmxAccount?: boolean;
  }
): BalancesDataResult {
  const { overrideAccount, overrideTokenList, refreshInterval, enabled = true, isGmxAccount = false } = params ?? {};

  const { resetTokensBalancesUpdates } = useTokensBalancesUpdates();

  const parseTokenBalancesResponse = useMemo(
    () => buildParseTokenBalancesResponse(resetTokensBalancesUpdates),
    [resetTokensBalancesUpdates]
  );

  const { address: currentAccount } = useAccount();

  const account = overrideAccount ?? currentAccount;

  const { data, error } = useMulticall(chainId, "useTokenBalances", {
    key: account && enabled ? [account, isGmxAccount, overrideTokenList?.map((t) => t.address)] : null,
    refreshInterval,
    request: buildTokenBalancesRequest,
    parseResponse: parseTokenBalancesResponse,
  });

  const balancesData = useUpdatedTokensBalances(data);

  return {
    balancesData,
    error,
  };
}
