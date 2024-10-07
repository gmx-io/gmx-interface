import { useMemo } from "react";

import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMulticall } from "lib/multicall";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import type { TokensAllowanceData } from "./types";

import Token from "abis/Token.json";

type TokenAllowanceResult = { tokensAllowanceData?: TokensAllowanceData; refetchTokensAllowanceData: () => void };

const defaultValue = {};

export function useTokensAllowanceData(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[]; skip?: boolean }
): TokenAllowanceResult {
  const { spenderAddress, tokenAddresses, skip } = p;
  const { account } = useWallet();
  const { approvalStatuses } = useSyntheticsEvents();

  const isNativeToken = tokenAddresses.length === 1 && tokenAddresses[0] === NATIVE_TOKEN_ADDRESS;

  const {
    data,
    // TODO: we wont need mutate if testApprovalWebSocketsEvents is passed
    mutate,
  } = useMulticall(chainId, "useTokenAllowance", {
    key:
      !skip && account && spenderAddress && tokenAddresses.length > 0 && !isNativeToken
        ? [account, spenderAddress, tokenAddresses.join("-")]
        : null,
    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL + 5000, // every 10s
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
      const eventValue: bigint | undefined = event?.value;
      const eventCreatedAt: number = event?.createdAt ?? 0;

      const multicallData: bigint | undefined = data?.tokenAllowance[tokenAddress];
      const multicallCreatedAt: number = data?.createdAt ?? 0;

      if (eventCreatedAt > multicallCreatedAt && eventValue !== undefined) {
        newData[tokenAddress] = eventValue;
      } else if (multicallData !== undefined) {
        newData[tokenAddress] = multicallData;
      }
    }

    return newData;
  }, [spenderAddress, tokenAddresses, data, approvalStatuses]);

  return {
    tokensAllowanceData: isNativeToken ? defaultValue : mergedData,
    refetchTokensAllowanceData: mutate,
  };
}
