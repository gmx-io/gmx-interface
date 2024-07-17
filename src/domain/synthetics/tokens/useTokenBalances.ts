import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { getV2Tokens, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { TokenBalancesData } from "./types";

import Multicall from "abis/Multicall.json";
import Token from "abis/Token.json";
import { useInjectMulticall, useIsInMulticallFetcher } from "context/SyntheticsStateContext/useInjectMulticall";

type BalancesDataResult = {
  balancesData?: TokenBalancesData;
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
  const isInMulticallFetcher = useIsInMulticallFetcher();
  const useAbstractMulticall = isInMulticallFetcher ? useInjectMulticall : useMulticall;

  const { address: currentAccount } = useAccount();

  const account = overrideAccount ?? currentAccount;

  const { data } = useAbstractMulticall(chainId, "useTokenBalances", {
    key: account ? [account, ...(overrideTokenList || []).map((t) => t.address)] : null,
    groupId: "1",

    refreshInterval: refreshInterval as any,

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
    parseResponse: (res) =>
      Object.keys(res.data).reduce((tokenBalances: TokenBalancesData, tokenAddress) => {
        tokenBalances[tokenAddress] = res.data[tokenAddress].balance.returnValues[0];

        return tokenBalances;
      }, {} as TokenBalancesData),
  });

  return {
    balancesData: data,
  };
}
