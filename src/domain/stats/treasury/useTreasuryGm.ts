import { useMemo } from "react";

import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import type { TokensData } from "domain/synthetics/tokens";
import { useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import type { MarketsData } from "sdk/types/markets";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import { createBalanceCalls, sumBalancesFromCalls } from "./shared";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

export function useTreasuryGm({
  chainId,
  addresses,
  tokensData,
  marketsData,
  marketsAddresses,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokensData?: TokensData;
  marketsData?: MarketsData;
  marketsAddresses?: string[];
}): TreasuryData | undefined {
  const requestConfig = useMemo(() => {
    if (!addresses.length || !marketsAddresses?.length || !marketsData || !tokensData) {
      return undefined;
    }

    return buildTreasuryMarketsRequest({
      chainId,
      addresses,
      marketsAddresses,
      marketsData,
      tokensData,
    });
  }, [addresses, chainId, marketsAddresses, marketsData, tokensData]);

  const { data: marketBalancesResponse } = useMulticall(chainId, "useTreasuryMarkets", {
    key: requestConfig && marketsAddresses ? [chainId, "markets", addresses.length, marketsAddresses.length] : null,
    request: requestConfig ?? {},
    parseResponse: (res) => res.data,
  });

  return useMemo(() => {
    if (marketsAddresses === undefined || marketsData === undefined || tokensData === undefined) {
      return undefined;
    }

    if (!marketsAddresses.length) {
      return TREASURY_EMPTY_RESULT;
    }

    if (requestConfig && marketBalancesResponse === undefined) {
      return undefined;
    }

    if (!marketBalancesResponse) {
      return TREASURY_EMPTY_RESULT;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    marketsAddresses.forEach((marketAddress) => {
      const balancesConfig = marketBalancesResponse[`${marketAddress}-balances`];
      const balance = sumBalancesFromCalls(balancesConfig, addresses.length);

      if (balance === 0n) {
        return;
      }

      const decimalsRaw = balancesConfig?.decimals?.returnValues?.[0];
      const decimals = decimalsRaw !== undefined ? Number(decimalsRaw) : 18;

      let usdValue = 0n;
      const pricesConfig = marketBalancesResponse[`${marketAddress}-prices`];
      const minPrice = pricesConfig?.minPrice?.returnValues?.[0];
      const maxPrice = pricesConfig?.maxPrice?.returnValues?.[0];

      if (minPrice !== undefined && maxPrice !== undefined) {
        const price = getMidPrice({ minPrice, maxPrice });
        const usd = convertToUsd(balance, decimals, price);

        if (usd !== undefined) {
          usdValue = usd;
          totalUsd += usd;
        }
      }

      assets.push({
        address: marketAddress,
        type: "gmxV2",
        balance,
        usdValue,
        chainId,
        decimals,
      });
    });

    return { assets, totalUsd };
  }, [addresses.length, chainId, marketBalancesResponse, marketsAddresses, marketsData, requestConfig, tokensData]);
}

function buildTreasuryMarketsRequest({
  chainId,
  addresses,
  marketsAddresses,
  marketsData,
  tokensData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  marketsAddresses: string[];
  marketsData: MarketsData;
  tokensData: TokensData;
}) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const syntheticsReaderAddress = getContract(chainId, "SyntheticsReader");

  return marketsAddresses.reduce((acc, marketAddress) => {
    const market = marketsData[marketAddress];

    acc[`${marketAddress}-balances`] = {
      contractAddress: marketAddress,
      abiId: "Token",
      calls: createBalanceCalls(addresses, { includeDecimals: true }),
    };

    if (market) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (marketPrices) {
        const marketProps = {
          marketToken: market.marketTokenAddress,
          longToken: market.longTokenAddress,
          shortToken: market.shortTokenAddress,
          indexToken: market.indexTokenAddress,
        };

        acc[`${marketAddress}-prices`] = {
          contractAddress: syntheticsReaderAddress,
          abiId: "SyntheticsReader",
          calls: {
            minPrice: {
              methodName: "getMarketTokenPrice",
              params: [
                dataStoreAddress,
                marketProps,
                marketPrices.indexTokenPrice,
                marketPrices.longTokenPrice,
                marketPrices.shortTokenPrice,
                MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
                false,
              ],
            },
            maxPrice: {
              methodName: "getMarketTokenPrice",
              params: [
                dataStoreAddress,
                marketProps,
                marketPrices.indexTokenPrice,
                marketPrices.longTokenPrice,
                marketPrices.shortTokenPrice,
                MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
                true,
              ],
            },
          },
        };
      }
    }

    return acc;
  }, {});
}
