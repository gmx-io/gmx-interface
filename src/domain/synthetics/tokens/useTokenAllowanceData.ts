import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { getWrappedToken } from "config/tokens";
import { isAddressZero } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { TokenAllowancesData } from "./types";

type TokenAllowanceResult = {
  tokenAllowanceData: TokenAllowancesData;
  isLoading: boolean;
};

export function useTokenAllowanceData(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[] }
): TokenAllowanceResult {
  const { account } = useWeb3React();

  const wrappedToken = getWrappedToken(chainId);

  const { data: tokenAllowance, isLoading } = useMulticall(chainId, "useTokenAllowance", {
    key:
      account && p.spenderAddress && p.tokenAddresses.length > 0
        ? [account, p.spenderAddress, p.tokenAddresses.join("-")]
        : null,

    request: () =>
      p.tokenAddresses.reduce((contracts, address) => {
        contracts[address] = {
          contractAddress: isAddressZero(address) ? wrappedToken.address : address,
          abi: Token.abi,
          calls: {
            allowance: {
              methodName: "allowance",
              params: [account, p.spenderAddress],
            },
          },
        };

        return contracts;
      }, {}),

    parseResponse: (res) =>
      Object.keys(res).reduce((tokenAllowance: TokenAllowancesData, address) => {
        tokenAllowance[address] = res[address].allowance.returnValues[0];

        return tokenAllowance;
      }, {} as TokenAllowancesData),
  });

  return useMemo(() => {
    return {
      tokenAllowanceData: tokenAllowance || {},
      isLoading,
    };
  }, [isLoading, tokenAllowance]);
}
