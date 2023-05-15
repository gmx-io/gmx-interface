import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import {
  virtualInventoryForPositionsKey,
  virtualInventoryForSwapsKey,
  virtualMarketIdKey,
  virtualTokenIdKey,
} from "config/dataStore";
import { getAvailableTradeTokens } from "config/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { VirtualInventoryForPositionsData, VirtualInventoryForSwapsData } from "./types";
import { useMarkets } from "../markets";

export type VirtualInventoryResult = {
  virtualInventoryForSwaps?: VirtualInventoryForSwapsData;
  virtualInventoryForPositions?: VirtualInventoryForPositionsData;
};

const ZERO_VIRTUAL_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function useVirtualInventory(chainId: number): VirtualInventoryResult {
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const tokens = useMemo(() => getAvailableTradeTokens(chainId, { includeSynthetic: true }), [chainId]);

  const { data: virtualIds } = useMulticall(chainId, "useVirtualInventory-ids", {
    key: marketsAddresses?.length ? [chainId, marketsAddresses?.join("-")] : null,
    request: () => {
      const req: MulticallRequestConfig<any> = {
        dataStore: {
          contractAddress: getContract(chainId, "DataStore"),
          abi: DataStore.abi,
          calls: {},
        },
      };

      tokens.forEach((token) => {
        if (!token.isNative) {
          req.dataStore.calls[`token-${token.address}`] = {
            methodName: "getBytes32",
            params: [virtualTokenIdKey(token.address)],
          };
        }
      });

      marketsAddresses!.forEach((marketAddress) => {
        req.dataStore.calls[`market-${marketAddress}`] = {
          methodName: "getBytes32",
          params: [virtualMarketIdKey(marketAddress)],
        };
      });

      return req;
    },
    parseResponse: (res) => {
      const response = {
        virtualMarketsIds: {},
        virtualTokensIds: {},
      };

      tokens.forEach((token) => {
        if (!token.isNative) {
          response.virtualTokensIds[token.address] = res.dataStore[`token-${token.address}`].returnValues[0];
        }
      });

      marketsAddresses!.forEach((marketAddress) => {
        response.virtualMarketsIds[marketAddress] = res.dataStore[`market-${marketAddress}`].returnValues[0];
      });

      return response;
    },
  });

  const { data: virtualInventory } = useMulticall(chainId, "useVirtualInventory", {
    key: virtualIds
      ? [Object.keys(virtualIds.virtualMarketsIds).join("-"), Object.keys(virtualIds.virtualTokensIds).join("-")]
      : null,
    request: () => {
      const req: MulticallRequestConfig<any> = {
        dataStore: {
          contractAddress: getContract(chainId, "DataStore"),
          abi: DataStore.abi,
          calls: {},
        },
      };

      Object.keys(virtualIds!.virtualTokensIds).forEach((tokenAddress) => {
        if (virtualIds!.virtualTokensIds[tokenAddress] !== ZERO_VIRTUAL_ID) {
          req.dataStore.calls[`forPositions-${tokenAddress}`] = {
            methodName: "getInt",
            params: [virtualInventoryForPositionsKey(virtualIds!.virtualTokensIds[tokenAddress])],
          };
        }
      });

      Object.keys(virtualIds!.virtualMarketsIds).forEach((marketAddress) => {
        const market = marketsData![marketAddress];

        if (virtualIds!.virtualMarketsIds[marketAddress] !== ZERO_VIRTUAL_ID) {
          req.dataStore.calls[`forSwaps-${marketAddress}-${market.longTokenAddress}`] = {
            methodName: "getUint",
            params: [
              virtualInventoryForSwapsKey(virtualIds!.virtualMarketsIds[marketAddress], market.longTokenAddress),
            ],
          };

          req.dataStore.calls[`forSwaps-${marketAddress}-${market.shortTokenAddress}`] = {
            methodName: "getUint",
            params: [
              virtualInventoryForSwapsKey(virtualIds!.virtualMarketsIds[marketAddress], market.shortTokenAddress),
            ],
          };
        }
      });

      return req;
    },

    parseResponse: (res) => {
      const virtualInventoryForSwaps: VirtualInventoryForSwapsData = {};
      const virtualInventoryForPositions: VirtualInventoryForPositionsData = {};

      Object.keys(virtualIds!.virtualTokensIds).forEach((tokenAddress) => {
        if (virtualIds!.virtualTokensIds[tokenAddress] !== ZERO_VIRTUAL_ID) {
          virtualInventoryForPositions[tokenAddress] = res.dataStore[`forPositions-${tokenAddress}`].returnValues[0];
        }
      });

      Object.keys(virtualIds!.virtualMarketsIds).forEach((marketAddress) => {
        const market = marketsData![marketAddress];

        if (virtualIds!.virtualMarketsIds[marketAddress] !== ZERO_VIRTUAL_ID) {
          virtualInventoryForSwaps[marketAddress] = {
            [market.longTokenAddress]:
              res.dataStore[`forSwaps-${marketAddress}-${market.longTokenAddress}`].returnValues[0],
            [market.shortTokenAddress]:
              res.dataStore[`forSwaps-${marketAddress}-${market.shortTokenAddress}`].returnValues[0],
          };
        }
      });

      return {
        virtualInventoryForSwaps,
        virtualInventoryForPositions,
      };
    },
  });

  return {
    virtualInventoryForPositions: virtualInventory?.virtualInventoryForPositions,
    virtualInventoryForSwaps: virtualInventory?.virtualInventoryForSwaps,
  };
}
