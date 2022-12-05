import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { getWrappedToken } from "config/tokens";
import { BigNumber } from "ethers";
import { isAddressZero } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { TokenAllowanceData } from "./types";

export function useTokenAllowance(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[] }
): TokenAllowanceData {
  const { account } = useWeb3React();

  const wrappedToken = getWrappedToken(chainId);

  const { data: tokenAllowance } = useMulticall(chainId, "useTokenAllowance", {
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
    parseResponse: (res) => {
      const tokenAllowance: { [address: string]: BigNumber } = {};

      Object.keys(res).forEach((address) => {
        const tokenResult = res[address];

        tokenAllowance[address] = tokenResult.allowance.returnValues[0];
      });

      return tokenAllowance;
    },
  });

  return useMemo(() => {
    return {
      tokenAllowance: tokenAllowance || {},
    };
  }, [tokenAllowance]);
}
