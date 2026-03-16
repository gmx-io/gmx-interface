import { useMemo } from "react";

import type { AnyChainId } from "config/chains";
import { isSourceChainForAnySettlementChain, MULTICALLS_MAP } from "config/multichain";
import { ApprovalStatus, useSyntheticsEvents } from "context/SyntheticsEvents";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { EMPTY_OBJECT } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import type { TokensAllowanceData } from ".";

export type TokenAllowanceResult = {
  tokensAllowanceData?: TokensAllowanceData;
  spenderAddress?: string;
  isLoading: boolean;
  isLoaded: boolean;
};

export function useTokensAllowanceData(
  chainId: AnyChainId | undefined,
  p: {
    spenderAddress?: string;
    tokenAddresses: string[];
    skip?: boolean;
  }
): TokenAllowanceResult {
  const { spenderAddress, tokenAddresses, skip } = p;
  const { account } = useWallet();
  const { approvalStatuses, multichainSourceChainApprovalStatuses } = useSyntheticsEvents();

  const validAddresses = tokenAddresses.filter((address): address is string => address !== NATIVE_TOKEN_ADDRESS);

  const key =
    !skip && account && spenderAddress && validAddresses.length > 0 ? [account, spenderAddress, validAddresses] : null;

  const { data } = useMulticall(chainId, "useTokenAllowance", {
    key,
    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    request: (currentChainId) => {
      const allowanceCalls = validAddresses.reduce((contracts, address) => {
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
      }, {} as MulticallRequestConfig<any>);

      const multicallAddress = MULTICALLS_MAP[currentChainId];

      allowanceCalls.multicall = {
        contractAddress: multicallAddress,
        abiId: "Multicall",
        calls: {
          blockNumber: {
            methodName: "getBlockNumber",
            params: [],
          },
        },
      };

      return allowanceCalls;
    },
    parseResponse: (res) => {
      const tokenAllowance: TokensAllowanceData = {};
      for (const address in res.data) {
        if (address === "multicall") {
          continue;
        }

        tokenAllowance[address] = res.data[address].allowance.returnValues[0];
      }

      const multicallContextBlockNumber = res.data.multicall.blockNumber.returnValues[0] as bigint;

      return {
        tokenAllowance,
        blockNumber: multicallContextBlockNumber,
      };
    },
  });

  const mergedData: TokensAllowanceData | undefined = useMemo(() => {
    if (!spenderAddress || validAddresses.length === 0) {
      return EMPTY_OBJECT;
    }

    const newData: TokensAllowanceData = {};

    let statuses = approvalStatuses;
    if (isSourceChainForAnySettlementChain(chainId)) {
      statuses = multichainSourceChainApprovalStatuses;
    }

    for (const tokenAddress of validAddresses) {
      const event: ApprovalStatus | undefined = statuses[tokenAddress]?.[spenderAddress];
      const eventValue: bigint | undefined = event?.value;
      const eventBlockNumber: bigint = event?.blockNumber ?? 0n;

      const multicallData: bigint | undefined = data?.tokenAllowance[tokenAddress];
      const multicallBlockNumber: bigint | undefined = data?.blockNumber;
      const isEventAtLeastAsNewAsMulticall =
        multicallBlockNumber !== undefined && eventBlockNumber >= multicallBlockNumber;

      if (eventValue !== undefined && (multicallData === undefined || isEventAtLeastAsNewAsMulticall)) {
        newData[tokenAddress] = eventValue;
      } else if (multicallData !== undefined) {
        newData[tokenAddress] = multicallData;
      }
    }

    return newData;
  }, [
    spenderAddress,
    validAddresses,
    approvalStatuses,
    chainId,
    multichainSourceChainApprovalStatuses,
    data?.tokenAllowance,
    data?.blockNumber,
  ]);

  const isLoaded = validAddresses.length > 0 && validAddresses.every((address) => mergedData?.[address] !== undefined);
  const isLoading = Boolean(key) && !isLoaded;

  return {
    tokensAllowanceData: isLoaded ? mergedData : undefined,
    spenderAddress,
    isLoaded,
    isLoading,
  };
}
