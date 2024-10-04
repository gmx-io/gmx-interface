import { useMemo } from "react";

import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import type { TokensAllowanceData } from "./types";

import Token from "abis/Token.json";

type TokenAllowanceResult = {
  tokensAllowanceData?: TokensAllowanceData;
};

const defaultValue = {};

export function useTokensAllowanceData(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[]; skip?: boolean }
): TokenAllowanceResult {
  const { spenderAddress, tokenAddresses, skip } = p;
  const { account } = useWallet();
  const { approvalStatuses } = useSyntheticsEvents();

  const isNativeToken = tokenAddresses.length === 1 && tokenAddresses[0] === NATIVE_TOKEN_ADDRESS;

  const { data } = useMulticall(chainId, "useTokenAllowance", {
    key:
      !skip && account && spenderAddress && tokenAddresses.length > 0 && !isNativeToken
        ? [account, spenderAddress, tokenAddresses.join("-")]
        : null,
    refreshInterval: CONFIG_UPDATE_INTERVAL,
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

    parseResponse: (res) => {
      const now = Date.now();

      const tokenAllowance = Object.keys(res.data).reduce((tokenAllowance: TokensAllowanceData, address) => {
        tokenAllowance[address] = res.data[address].allowance.returnValues[0];

        return tokenAllowance;
      }, {} as TokensAllowanceData);

      return {
        tokenAllowance,
        createdAt: now,
      };
    },
  });

  const mergedData: TokensAllowanceData | undefined = useMemo(() => {
    if (!spenderAddress || tokenAddresses.length === 0) {
      return data?.tokenAllowance;
    }

    const newData: TokensAllowanceData = {};

    for (const tokenAddress of tokenAddresses) {
      const event = approvalStatuses[tokenAddress]?.[spenderAddress];
      if (!event) {
        if (data && tokenAddress in data.tokenAllowance) {
          newData[tokenAddress] = data.tokenAllowance[tokenAddress];
        }
        continue;
      }

      const eventValue = event.value;
      const eventCreatedAt = event.createdAt;

      if (!data || !(tokenAddress in data.tokenAllowance)) {
        newData[tokenAddress] = eventValue;
        continue;
      }

      const allowance = data.tokenAllowance[tokenAddress];
      if (eventCreatedAt > data.createdAt) {
        newData[tokenAddress] = eventValue;
      } else {
        newData[tokenAddress] = allowance;
      }
    }

    return newData;
  }, [spenderAddress, tokenAddresses, data, approvalStatuses]);

  return {
    tokensAllowanceData: isNativeToken ? defaultValue : mergedData,
  };
}
