import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { getV2Tokens, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { TokenBalancesData } from "./types";

import Multicall from "abis/Multicall.json";
import Token from "abis/Token.json";
import { getIsFlagEnabled } from "config/ab";
import {
  useTokensBalancesContext,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";

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
  const { resetTokensBalancesUpdates } = useTokensBalancesContext();

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
            abi: Multicall.abi,
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
            abi: Token.abi,
            calls: {
              balance: {
                methodName: "balanceOf",
                params: [account ?? PLACEHOLDER_ACCOUNT],
              },
            },
          };
        }

        return acc;
      }, {}),
    parseResponse: (res) => {
      const result: TokenBalancesData = {};

      Object.keys(res.data).forEach((tokenAddress) => {
        result[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];
      });

      if (getIsFlagEnabled("testWebsocketBalances")) {
        resetTokensBalancesUpdates(Object.keys(result));
      }

      return result;
    },
  });

  const balancesData = useUpdatedTokensBalances(data);

  return {
    balancesData,
    error,
  };
}
