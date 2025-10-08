import { useMemo } from "react";

import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import type { TokensData, TokenPrices, TokenPricesData } from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallConfig, ContractCallResult } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getVenusDeployment, type VenusDeployment } from "sdk/configs/venus";
import type { MarketsData } from "sdk/types/markets";
import type { Token } from "sdk/types/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import type { TreasuryBalanceEntry } from "./types";

const EXCHANGE_RATE_DECIMALS = 18n;

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
}): { entries: TreasuryBalanceEntry[]; totalUsd: bigint } | undefined {
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

    const map = new Map<string, TokenPrices>();

    Object.entries(gmPriceResponse).forEach(([address, result]) => {
      const minRaw = result?.minPrice?.returnValues?.[0];
      const maxRaw = result?.maxPrice?.returnValues?.[0];

      if (minRaw === undefined || maxRaw === undefined) {
        return;
      }

      map.set(address.toLowerCase(), {
        minPrice: BigInt(minRaw),
        maxPrice: BigInt(maxRaw),
      });
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

    const entries: TreasuryBalanceEntry[] = [];
    let totalUsd = 0n;

    deployment.vTokens.forEach((config) => {
      const tokenResult = data[config.vTokenAddress];

      if (!tokenResult) {
        return;
      }

      const underlyingToken = tokenMap[config.underlyingAddress];
      const tokenDecimals = underlyingToken?.decimals ?? 18;

      const balance = sumBalances(tokenResult, addresses.length);

      if (balance === 0n) {
        return;
      }

      const exchangeRateRaw = tokenResult.exchangeRate?.returnValues?.[0];

      if (exchangeRateRaw === undefined) {
        return;
      }

      const exchangeRate = BigInt(exchangeRateRaw);
      const underlyingBalance = (balance * exchangeRate) / 10n ** EXCHANGE_RATE_DECIMALS;

      const tokenPrice = underlyingToken ? pricesData?.[underlyingToken.address] : undefined;
      const gmPrice = gmPrices?.get(config.underlyingAddress.toLowerCase());
      const effectivePrice = tokenPrice ?? gmPrice;

      if (!effectivePrice) {
        return;
      }

      const usd = convertToUsd(underlyingBalance, tokenDecimals, getMidPrice(effectivePrice));

      if (typeof usd !== "bigint") {
        return;
      }

      totalUsd += usd;

      entries.push({
        address: config.vTokenAddress,
        type: "venus",
        balance: underlyingBalance,
        usdValue: usd,
        chainId,
        decimals: tokenDecimals,
      });
    });

    return { entries, totalUsd };
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

function buildVenusRequest({
  addresses,
  deployment,
}: {
  addresses: string[];
  deployment: VenusDeployment;
}): MulticallRequestConfig<Record<string, { calls: Record<string, ContractCallConfig> }>> {
  const request: MulticallRequestConfig<Record<string, { calls: Record<string, ContractCallConfig> }>> = {};

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

function sumBalances(result: Record<string, ContractCallResult | undefined> | undefined, count: number): bigint {
  if (!result) {
    return 0n;
  }

  let balance = 0n;

  for (let index = 0; index < count; index++) {
    const rawValue = result[`balance_${index}`]?.returnValues?.[0];

    if (rawValue !== undefined && rawValue !== null) {
      balance += BigInt(rawValue);
    }
  }

  return balance;
}
