import { useMemo } from "react";

import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import type { TokensData, TokenPricesData } from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallConfig } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getVenusDeployment, type VenusDeployment, VENUS_EXCHANGE_RATE_DECIMALS } from "sdk/configs/venus";
import { bigMath } from "sdk/utils/bigmath";
import type { MarketsData } from "sdk/utils/markets/types";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";
import type { Token } from "sdk/utils/tokens/types";

import { TREASURY_EMPTY_RESULT } from "./constants";
import { sumBalancesFromCalls } from "./shared";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

export function useTreasuryVenus({
  chainId,
  addresses,
  tokenMap,
  pricesData,
  tokensData,
  marketsData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
  tokensData?: TokensData;
  marketsData?: MarketsData;
}): TreasuryData | undefined {
  const deployment = getVenusDeployment(chainId);

  const requestConfig = useMemo(() => {
    if (!deployment || !addresses.length) {
      return undefined;
    }

    return buildVenusRequest({ addresses, deployment });
  }, [deployment, addresses]);

  const { data } = useMulticall(chainId, "useTreasuryVenus", {
    key: requestConfig ? [chainId, "venus", addresses.length] : null,
    request: requestConfig ?? {},
    parseResponse: (res) => res.data,
  });

  const gmPriceRequest = useMemo(() => {
    if (!deployment || !tokensData || !marketsData) {
      return undefined;
    }

    const dataStoreAddress = getContract(chainId, "DataStore");
    const syntheticsReaderAddress = getContract(chainId, "SyntheticsReader");
    const request: MulticallRequestConfig<Record<string, { calls: Record<string, ContractCallConfig> }>> = {};

    deployment.vTokens.forEach((config) => {
      const market = marketsData?.[config.underlyingAddress];

      if (!market) {
        return;
      }

      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices) {
        return;
      }

      const marketProps = {
        marketToken: market.marketTokenAddress,
        longToken: market.longTokenAddress,
        shortToken: market.shortTokenAddress,
        indexToken: market.indexTokenAddress,
      };

      request[config.underlyingAddress] = {
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
    });

    return Object.keys(request).length ? request : undefined;
  }, [chainId, deployment, marketsData, tokensData]);

  const { data: gmPriceResponse } = useMulticall(chainId, "useTreasuryVenusGmPrices", {
    key: gmPriceRequest ? [chainId, "venus", "gmPrices", Object.keys(gmPriceRequest).length] : null,
    request: gmPriceRequest ?? {},
    parseResponse: (res) => res.data,
  });

  const gmPrices = useMemo(() => {
    if (!gmPriceResponse) {
      return undefined;
    }

    const map = {};

    Object.entries(gmPriceResponse).forEach(([address, result]) => {
      const minPrice = result?.minPrice?.returnValues?.[0];
      const maxPrice = result?.maxPrice?.returnValues?.[0];

      if (minPrice === undefined || maxPrice === undefined) {
        return;
      }

      map[address] = {
        minPrice,
        maxPrice,
      };
    });

    return map;
  }, [gmPriceResponse]);

  return useMemo(() => {
    if ((requestConfig && data === undefined) || (gmPriceRequest && gmPriceResponse === undefined)) {
      return undefined;
    }

    if (!deployment || !data) {
      return TREASURY_EMPTY_RESULT;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    deployment.vTokens.forEach((config) => {
      const tokenResult = data[config.vTokenAddress];

      if (!tokenResult) {
        return;
      }

      const underlyingToken = tokenMap[config.underlyingAddress];
      const tokenDecimals = underlyingToken?.decimals ?? 18;

      const balance = sumBalancesFromCalls(tokenResult, addresses.length);

      if (balance === 0n) {
        return;
      }

      const exchangeRate = tokenResult.exchangeRate?.returnValues?.[0];

      if (exchangeRate === undefined) {
        return;
      }

      const underlyingBalance = bigMath.mulDiv(balance, exchangeRate, 10n ** VENUS_EXCHANGE_RATE_DECIMALS);

      const tokenPrice = underlyingToken ? pricesData?.[underlyingToken.address] : undefined;
      const gmPrice = gmPrices?.[config.underlyingAddress];
      const price = tokenPrice ?? gmPrice;

      if (!price) {
        return;
      }

      const usd = convertToUsd(underlyingBalance, tokenDecimals, getMidPrice(price))!;

      totalUsd += usd;

      assets.push({
        address: config.vTokenAddress,
        type: "venus",
        balance: underlyingBalance,
        usdValue: usd,
        chainId,
        decimals: tokenDecimals,
      });
    });

    return { assets, totalUsd };
  }, [
    addresses.length,
    chainId,
    data,
    deployment,
    gmPriceRequest,
    gmPriceResponse,
    gmPrices,
    pricesData,
    requestConfig,
    tokenMap,
  ]);
}

function buildVenusRequest({ addresses, deployment }: { addresses: string[]; deployment: VenusDeployment }) {
  const request = {};

  deployment.vTokens.forEach((vToken) => {
    const calls: Record<string, ContractCallConfig> = {};

    addresses.forEach((account, index) => {
      calls[`balance_${index}`] = {
        methodName: "balanceOf",
        params: [account],
      };
    });

    calls.exchangeRate = {
      methodName: "exchangeRateStored",
      params: [],
    };

    request[vToken.vTokenAddress] = {
      contractAddress: vToken.vTokenAddress,
      abiId: "VenusVToken",
      calls,
    };
  });

  return request;
}
