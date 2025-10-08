import { useMemo } from "react";

import { getContract } from "config/contracts";
import { GLV_MARKETS } from "config/markets";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import { convertToContractTokenPrices } from "domain/synthetics/tokens";
import type { TokensData } from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallResult } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import type { MarketsData } from "sdk/types/markets";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import type { TreasuryBalanceEntry } from "./types";

type TreasuryMulticallRequest = MulticallRequestConfig<Record<string, { calls: Record<string, unknown> }>>;
type MulticallContractResults = Record<string, ContractCallResult | undefined>;

type GlvListItem = {
  glv: {
    glvToken: string;
    longToken: string;
    shortToken: string;
  };
  markets: string[];
};

type GlvEntry = {
  glvToken: string;
  longToken: string;
  shortToken: string;
  markets: string[];
};

export function useTreasuryGlv({
  chainId,
  addresses,
  tokensData,
  marketsData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokensData?: TokensData;
  marketsData?: MarketsData;
}): { entries: TreasuryBalanceEntry[]; totalUsd: bigint } | undefined {
  const glvListConfig = useMemo(() => {
    if (!GLV_MARKETS[chainId] || Object.keys(GLV_MARKETS[chainId]).length === 0) {
      return undefined;
    }

    return buildTreasuryGlvListRequest(chainId);
  }, [chainId]);

  const { data: glvList } = useMulticall(chainId, "useTreasuryGlvList", {
    key: glvListConfig ? [chainId, "glvList"] : null,
    request: glvListConfig ?? {},
    parseResponse: (res) => extractGlvList(res.data),
  });

  const glvEntriesData = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }

    if (!glvList?.length || glvListConfig === undefined) {
      return { entries: [], request: undefined };
    }

    return buildTreasuryGlvRequest({
      chainId,
      addresses,
      glvList,
      tokensData,
      marketsData: marketsData ?? {},
    });
  }, [addresses, chainId, glvList, glvListConfig, marketsData, tokensData]);

  const glvEntries = glvEntriesData?.entries;
  const glvBalancesConfig = glvEntriesData?.request;
  const glvEntriesCount = glvEntries?.length ?? 0;

  const { data: glvBalancesResponse } = useMulticall(chainId, "useTreasuryGlv", {
    key: glvBalancesConfig && glvEntriesCount ? [chainId, "glv", glvEntriesCount] : null,
    request: glvBalancesConfig ?? {},
    parseResponse: (res) => res.data,
  });

  return useMemo(() => {
    if (tokensData === undefined || marketsData === undefined) {
      return undefined;
    }

    if (glvBalancesConfig && glvBalancesResponse === undefined) {
      return undefined;
    }

    if (!glvBalancesResponse || !glvEntries?.length || glvListConfig === undefined) {
      return TREASURY_EMPTY_RESULT;
    }

    const entries: TreasuryBalanceEntry[] = [];
    let totalUsd = 0n;

    glvEntries.forEach((entry) => {
      const balancesConfig = glvBalancesResponse[`${entry.glvToken}-balances`];
      const balance = sumBalancesFromCalls(balancesConfig, addresses.length);

      if (balance === 0n) {
        return;
      }

      const decimalsRaw = balancesConfig?.decimals?.returnValues?.[0];
      const decimals = decimalsRaw !== undefined ? Number(decimalsRaw) : 18;

      let usdValue = 0n;
      const pricesConfig = glvBalancesResponse[`${entry.glvToken}-prices`];
      const minRaw = pricesConfig?.glvTokenPriceMin?.returnValues?.[0];
      const maxRaw = pricesConfig?.glvTokenPriceMax?.returnValues?.[0];

      if (minRaw !== undefined && maxRaw !== undefined) {
        const price = getMidPrice({ minPrice: BigInt(minRaw), maxPrice: BigInt(maxRaw) });
        const usd = convertToUsd(balance, decimals, price);

        if (usd !== undefined) {
          usdValue = usd;
          totalUsd += usd;
        }
      }

      entries.push({
        address: entry.glvToken,
        type: "glv",
        balance,
        usdValue,
        chainId,
        decimals,
      });
    });

    return { entries, totalUsd };
  }, [
    tokensData,
    marketsData,
    glvBalancesConfig,
    glvBalancesResponse,
    glvEntries,
    glvListConfig,
    addresses.length,
    chainId,
  ]);
}

function extractGlvList(data: Record<string, any> | undefined): GlvListItem[] | undefined {
  const rawList = data?.glvs?.list?.returnValues;

  if (!Array.isArray(rawList)) {
    return undefined;
  }

  return rawList;
}

function sumBalancesFromCalls(result: MulticallContractResults | undefined, addressesCount: number): bigint {
  if (!result || !addressesCount) {
    return 0n;
  }

  let balance = 0n;

  for (let index = 0; index < addressesCount; index++) {
    const rawValue = result[`balance_${index}`]?.returnValues?.[0];

    if (rawValue !== undefined && rawValue !== null) {
      balance += typeof rawValue === "bigint" ? rawValue : BigInt(rawValue);
    }
  }

  return balance;
}

function buildTreasuryGlvListRequest(chainId: ContractsChainId): TreasuryMulticallRequest {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const glvReaderAddress = getContract(chainId, "GlvReader");

  return {
    glvs: {
      contractAddress: glvReaderAddress,
      abiId: "GlvReader",
      calls: {
        list: {
          methodName: "getGlvInfoList",
          params: [dataStoreAddress, 0, 100],
        },
      },
    },
  };
}

function buildTreasuryGlvRequest({
  chainId,
  addresses,
  glvList,
  tokensData,
  marketsData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  glvList: GlvListItem[];
  tokensData: TokensData;
  marketsData: MarketsData;
}): { entries: GlvEntry[]; request: TreasuryMulticallRequest | undefined } {
  const glvConfig = GLV_MARKETS[chainId] ?? {};
  const dataStoreAddress = getContract(chainId, "DataStore");
  const glvReaderAddress = getContract(chainId, "GlvReader");

  const request: TreasuryMulticallRequest = {};
  const entries: GlvEntry[] = [];

  glvList.forEach(({ glv, markets }) => {
    if (!glvConfig[glv.glvToken]) {
      return;
    }

    const longTokenData = tokensData[glv.longToken];
    const shortTokenData = tokensData[glv.shortToken];

    if (!longTokenData?.prices || !shortTokenData?.prices) {
      return;
    }

    const contractGlvPricesLong = convertToContractTokenPrices(longTokenData.prices, longTokenData.decimals);
    const contractGlvPricesShort = convertToContractTokenPrices(shortTokenData.prices, shortTokenData.decimals);

    const validMarkets: string[] = [];
    const marketPriceRanges: [bigint, bigint][] = [];

    markets.forEach((marketAddress) => {
      const market =
        marketsData[marketAddress] ??
        marketsData[marketAddress.toLowerCase()] ??
        marketsData[marketAddress.toUpperCase()];

      if (!market) {
        return;
      }

      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices) {
        return;
      }

      validMarkets.push(marketAddress);
      marketPriceRanges.push([marketPrices.indexTokenPrice.min, marketPrices.indexTokenPrice.max]);
    });

    if (!validMarkets.length) {
      return;
    }

    entries.push({
      glvToken: glv.glvToken,
      longToken: glv.longToken,
      shortToken: glv.shortToken,
      markets: validMarkets,
    });

    request[`${glv.glvToken}-balances`] = {
      contractAddress: glv.glvToken,
      abiId: "Token",
      calls: createBalanceCalls(addresses, { includeDecimals: true }),
    };

    const glvPricesQuery = [
      dataStoreAddress,
      validMarkets,
      marketPriceRanges,
      [contractGlvPricesLong.min, contractGlvPricesLong.max],
      [contractGlvPricesShort.min, contractGlvPricesShort.max],
      glv.glvToken,
    ];

    request[`${glv.glvToken}-prices`] = {
      contractAddress: glvReaderAddress,
      abiId: "GlvReader",
      calls: {
        glvTokenPriceMin: {
          methodName: "getGlvTokenPrice",
          params: [...glvPricesQuery, false],
        },
        glvTokenPriceMax: {
          methodName: "getGlvTokenPrice",
          params: [...glvPricesQuery, true],
        },
      },
    };
  });

  return {
    entries,
    request: entries.length ? request : undefined,
  };
}

function createBalanceCalls(
  addresses: string[],
  options: { balanceMethodName?: string; includeDecimals?: boolean } = {}
): Record<string, { methodName: string; params: unknown[] }> {
  const { balanceMethodName = "balanceOf", includeDecimals } = options;

  const baseCalls: Record<string, { methodName: string; params: unknown[] }> = includeDecimals
    ? {
        decimals: {
          methodName: "decimals",
          params: [],
        },
      }
    : {};

  return addresses.reduce<Record<string, { methodName: string; params: unknown[] }>>((calls, account, index) => {
    calls[`balance_${index}`] = {
      methodName: balanceMethodName,
      params: [account],
    };

    return calls;
  }, baseCalls);
}
