import { useMemo } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import { UiContractsChain } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import type { TokensAllowanceData } from "./types";

export type TokenAllowanceResult = {
  tokensAllowanceData?: TokensAllowanceData;
  spenderAddress?: string;
  isLoading: boolean;
  isLoaded: boolean;
};

export function useTokensAllowanceData(
  chainId: UiContractsChain | undefined,
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
          abiId: "ERC20",
          calls: {
            allowance: {
              methodName: "allowance",
              params: [account, spenderAddress],
            },
          },
        };

        return contracts;
      }, {} as MulticallRequestConfig<any>),
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

  const isLoaded = validAddresses.length > 0 && validAddresses.every((address) => mergedData?.[address] !== undefined);
  const isLoading = Boolean(key) && !isLoaded;

  return {
    tokensAllowanceData: isLoaded ? mergedData : undefined,
    spenderAddress,
    isLoaded,
    isLoading,
  };
}
