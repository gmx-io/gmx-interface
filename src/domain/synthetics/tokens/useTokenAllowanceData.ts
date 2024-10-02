import { watchContractEvent } from "@wagmi/core";
import { useEffect, useMemo } from "react";
import type { Address, erc20Abi } from "viem";

import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
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

  const isNativeToken = tokenAddresses.length === 1 && tokenAddresses[0] === NATIVE_TOKEN_ADDRESS;

  const { data, mutate } = useMulticall(chainId, "useTokenAllowance", {
    key:
      !p.skip && account && spenderAddress && tokenAddresses.length > 0 && !isNativeToken
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

    parseResponse: (res) =>
      Object.keys(res.data).reduce((tokenAllowance: TokensAllowanceData, address) => {
        tokenAllowance[address] = res.data[address].allowance.returnValues[0];

        return tokenAllowance;
      }, {} as TokensAllowanceData),
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableTokenAddresses = useMemo(() => tokenAddresses as Address[], [tokenAddresses.join("-")]);

  useEffect(() => {
    if (skip || !account || !spenderAddress || stableTokenAddresses.length === 0) {
      return;
    }

    const unsubs = (stableTokenAddresses as Address[]).map((address) =>
      watchContractEvent(getRainbowKitConfig(), {
        abi: Token.abi as unknown as typeof erc20Abi,
        address: address,
        eventName: "Approval",
        args: {
          owner: account,
          spender: spenderAddress as Address,
        },
        onLogs: (logs) => {
          const newData = { ...data };

          for (const log of logs) {
            const { owner, spender, value } = log.args;
            if (owner === account && spender === spenderAddress) {
              newData[address] = value!;
            }
          }

          mutate(newData, { revalidate: false, optimisticData: newData });
        },
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [account, data, mutate, skip, spenderAddress, stableTokenAddresses]);

  return {
    tokensAllowanceData: isNativeToken ? defaultValue : data,
  };
}
