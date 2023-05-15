import { useWeb3React } from "@web3-react/core";
import Multicall from "abis/Multicall.json";
import Token from "abis/Token.json";
import { getContract } from "config/contracts";
import { getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { TokenBalancesData } from "./types";

type BalancesDataResult = {
  balancesData?: TokenBalancesData;
};

export function useTokenBalances(chainId: number, p: { tokenAddresses: string[] }): BalancesDataResult {
  const { account } = useWeb3React();

  const { data } = useMulticall(chainId, "useTokenBalances", {
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
    parseResponse: (res) =>
      Object.keys(res).reduce((tokenBalances: TokenBalancesData, tokenAddress) => {
        tokenBalances[tokenAddress] = res[tokenAddress].balance.returnValues[0];

        return tokenBalances;
      }, {} as TokenBalancesData),
  });

  return {
    balancesData: data,
  };
}
