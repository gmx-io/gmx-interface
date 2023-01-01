import { useWeb3React } from "@web3-react/core";
import Multicall from "abis/Multicall.json";
import Token from "abis/Token.json";
import { getContract } from "config/contracts";
import { getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { BigNumber } from "ethers";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { TokenBalancesData } from "./types";

export function useTokenBalancesData(chainId: number, p: { tokenAddresses: string[] }): TokenBalancesData {
  const { account } = useWeb3React();

  const { data: tokenBalances } = useMulticall(chainId, "useTokenBalances", {
    key: account && p.tokenAddresses.length > 0 ? [account, p.tokenAddresses.join("-")] : null,
    request: () =>
      p.tokenAddresses.reduce((acc, address) => {
        const token = getToken(chainId, address);
        // Skip synthetic tokens
        if (token.isSynthetic) return acc;

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
                params: [account],
              },
            },
          };
        }

        return acc;
      }, {}),
    parseResponse: (res) => {
      const tokenBalances: { [address: string]: BigNumber } = {};

      Object.keys(res).forEach((address) => {
        tokenBalances[address] = res[address].balance.returnValues[0] || BigNumber.from(0);
      });

      return tokenBalances;
    },
  });

  return useMemo(() => {
    return tokenBalances || {};
  }, [tokenBalances]);
}
