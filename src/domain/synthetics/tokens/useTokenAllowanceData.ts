import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import type { TokensAllowanceData } from "./types";

import Token from "abis/Token.json";

type TokenAllowanceResult = {
  tokensAllowanceData?: TokensAllowanceData;
  refetchTokensAllowanceData: () => void;
};

const defaultValue = {};

export function useTokensAllowanceData(
  chainId: number,
  { spenderAddress, tokenAddresses, skip }: { spenderAddress?: string; tokenAddresses: string[]; skip?: boolean }
): TokenAllowanceResult {
  const { account } = useWallet();

  const isNativeToken = tokenAddresses.length === 1 && tokenAddresses[0] === NATIVE_TOKEN_ADDRESS;

  const { data, mutate } = useMulticall(chainId, "useTokenAllowance", {
    key:
      !skip && account && spenderAddress && tokenAddresses.length > 0 && !isNativeToken
        ? [account, spenderAddress, tokenAddresses.join("-")]
        : null,
    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    request: () =>
      tokenAddresses
        .filter((address) => address !== NATIVE_TOKEN_ADDRESS)
        .reduce((contracts, address) => {
          contracts[address] = {
            contractAddress: address,
            abi: Token.abi,
            calls: {
              allowance: {
                methodName: "allowance",
                params: [account, spenderAddress],
              },
            },
          };

          return contracts;
        }, {}),

    parseResponse: (res) =>
      Object.keys(res.data).reduce((tokenAllowance: TokensAllowanceData, address) => {
        tokenAllowance[address] = res.data[address].allowance.returnValues[0];

        return tokenAllowance;
      }, {} as TokensAllowanceData),
  });

  return {
    tokensAllowanceData: isNativeToken ? defaultValue : data,
    refetchTokensAllowanceData: mutate,
  };
}
