import { useMemo } from "react";

import { getContract } from "config/contracts";
import { CLAIMABLE_FUNDING_AMOUNT } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import useWallet from "lib/wallets/useWallet";
import { ContractsChainId } from "sdk/configs/chains";
import { hashDataMap } from "sdk/utils/hash";

import { ClaimableFundingData, getMarketDivisor, useMarkets } from ".";

export function useClaimableFundingDataRequest(chainId: ContractsChainId) {
  const { account } = useWallet();
  const { marketsAddresses, marketsData } = useMarkets(chainId);

  const {
    data: claimableFundingData,
    isLoading,
    error,
  } = useMulticall(chainId, "useClaimableFundingDataRequest", {
    key: account && marketsAddresses?.length ? [account, ...marketsAddresses] : null,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () => {
      if (!marketsAddresses) {
        return {};
      }

      return marketsAddresses.reduce((request, marketAddress) => {
        const market = getByKey(marketsData, marketAddress);

        if (!market) {
          return request;
        }

        const keys = hashDataMap({
          claimableFundingAmountLong: [
            ["bytes32", "address", "address", "address"],
            [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.longTokenAddress, account as string],
          ],
          claimableFundingAmountShort: [
            ["bytes32", "address", "address", "address"],
            [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.shortTokenAddress, account as string],
          ],
        });

        request[marketAddress] = {
          contractAddress: getContract(chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            claimableFundingAmountLong: {
              methodName: "getUint",
              params: [keys.claimableFundingAmountLong],
            },
            claimableFundingAmountShort: {
              methodName: "getUint",
              params: [keys.claimableFundingAmountShort],
            },
          },
        };

        return request;
      }, {});
    },

    parseResponse: (result) => {
      return Object.entries(result.data).reduce((claimableFundingData, [marketAddress, callsResult]: [string, any]) => {
        const market = getByKey(marketsData, marketAddress);

        if (!market) {
          return claimableFundingData;
        }

        const marketDivisor = getMarketDivisor(market);

        claimableFundingData[marketAddress] = {
          claimableFundingAmountLong: callsResult.claimableFundingAmountLong.returnValues[0] / marketDivisor,
          claimableFundingAmountShort: callsResult.claimableFundingAmountShort.returnValues[0] / marketDivisor,
        };

        return claimableFundingData;
      }, {} as ClaimableFundingData);
    },
  });

  return useMemo(
    () => ({
      claimableFundingData,
      isLoading,
      error,
    }),
    [claimableFundingData, error, isLoading]
  );
}
