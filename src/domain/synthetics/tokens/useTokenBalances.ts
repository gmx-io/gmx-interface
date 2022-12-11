import { useWeb3React } from "@web3-react/core";
import Multicall from "abis/Multicall.json";
import Token from "abis/Token.json";
import { getContract } from "config/contracts";
import { BigNumber } from "ethers";
import { isAddressZero } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { TokenBalancesData } from "./types";

export function useTokenBalances(chainId: number, p: { tokenAddresses: string[] }): TokenBalancesData {
  const { account } = useWeb3React();

  const { data: tokenBalances } = useMulticall(chainId, "useTokenBalances", {
    key: account && p.tokenAddresses.length > 0 ? [account, p.tokenAddresses.join("-")] : null,
    request: () =>
      p.tokenAddresses.reduce((acc, address) => {
        if (isAddressZero(address)) {
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
