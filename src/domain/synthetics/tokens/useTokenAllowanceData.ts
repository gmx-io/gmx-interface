import { useMemo } from "react";
import { erc20Abi } from "viem";

import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import type { TokensAllowanceData } from "./types";

type TokenAllowanceResult = { tokensAllowanceData?: TokensAllowanceData; isLoading: boolean; isLoaded: boolean };

export function useTokensAllowanceData(
  chainId: number,
  p: {
    spenderAddress?: string;
    tokenAddresses: string[];
    skip?: boolean;
  }
): TokenAllowanceResult {
  const { spenderAddress, tokenAddresses, skip } = p;
  const { account } = useWallet();
  const { approvalStatuses } = useSyntheticsEvents();

  const validAddresses = tokenAddresses.filter((address): address is string => address !== NATIVE_TOKEN_ADDRESS);

  const key =
    !skip && account && spenderAddress && validAddresses.length > 0 ? [account, spenderAddress, validAddresses] : null;

  const { data } = useMulticall(chainId, "useTokenAllowance", {
    key,
    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    request: () =>
      validAddresses.reduce((contracts, address) => {
        contracts[address!] = {
          contractAddress: address,
          abi: erc20Abi,
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
    if (!spenderAddress || validAddresses.length === 0) {
      return EMPTY_OBJECT;
    }

    const newData: TokensAllowanceData = {};

    for (const tokenAddress of validAddresses) {
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
  }, [spenderAddress, validAddresses, data, approvalStatuses]);

  const isLoaded =
    p.tokenAddresses.length > 0 && p.tokenAddresses.every((address) => mergedData?.[address] !== undefined);
  const isLoading = Boolean(key) && !isLoaded;

  return {
    tokensAllowanceData: isLoaded ? mergedData : undefined,
    isLoaded,
    isLoading,
  };
}
