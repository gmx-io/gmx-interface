import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { getV2Tokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { TokenBalancesData } from "./types";

type BalancesDataResult = {
  balancesData?: TokenBalancesData;
  error?: Error;
};

export function useTokenBalances(
  chainId: number,
  overrideAccount?: string | undefined,
  overrideTokenList?: {
    address: string;
    isSynthetic?: boolean;
  }[],
  refreshInterval?: number
): BalancesDataResult {
  const { resetTokensBalancesUpdates } = useTokensBalancesUpdates();

  const { address: currentAccount } = useAccount();

  const account = overrideAccount ?? currentAccount;

  const { data, error } = useMulticall(chainId, "useTokenBalances", {
    key: account ? [account, ...(overrideTokenList || []).map((t) => t.address)] : null,

    refreshInterval,

    request: () =>
      (overrideTokenList ?? getV2Tokens(chainId)).reduce((acc, token) => {
        // Skip synthetic tokens
        if (token.isSynthetic) return acc;

        const address = token.address;

        if (address === NATIVE_TOKEN_ADDRESS) {
          acc[address] = {
            contractAddress: getContract(chainId, "Multicall"),
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
      }, {} as MulticallRequestConfig<any>),
    parseResponse: (res) => {
      const result: TokenBalancesData = {};

      Object.keys(res.data).forEach((tokenAddress) => {
        result[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];
      });

      resetTokensBalancesUpdates(Object.keys(result));

      return result;
    },
  });

  const balancesData = useUpdatedTokensBalances(data);

  return {
    balancesData,
    error,
  };
}
