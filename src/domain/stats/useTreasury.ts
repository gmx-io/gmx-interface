import { useMemo } from "react";

import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { GLV_MARKETS } from "config/markets";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import {
  TokenPricesData,
  TokensData,
  convertToContractTokenPrices,
  useTokenRecentPricesRequest,
  useTokensDataRequest,
} from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallConfig, ContractCallResult } from "lib/multicall";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getToken, getTokensMap, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { MarketsData } from "sdk/types/markets";
import type { Token } from "sdk/types/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

const TREASURY_ADDRESSES = [
  "0x4bd1cdaab4254fc43ef6424653ca2375b4c94c0e",
  "0xc6378ddf536410c14666dc59bc92b5ebc0f2f79e",
  "0x0263ad94023a5df6d64f54bfef089f1fbf8a4ca0",
  "0xea8a734db4c7ea50c32b5db8a0cb811707e8ace3",
  "0xe1f7c5209938780625e354dc546e28397f6ce174",
  "0x68863dde14303bced249ca8ec6af85d4694dea6a",
  "0x0339740d92fb8baf73bab0e9eb9494bc0df1cafd",
  "0x2c247a44928d66041d9f7b11a69d7a84d25207ba",
];

type TreasuryMulticallRequest = MulticallRequestConfig<Record<string, { calls: Record<string, unknown> }>>;

type TreasuryBalanceEntry = {
  address: string;
  type: "token" | "gmxV2" | "glv";
  balance: bigint;
  usdValue: bigint;
  chainId: ContractsChainId;
  token?: Token;
  decimals?: number;
};

type GlvListItem = {
  glv: {
    glvToken: string;
    longToken: string;
    shortToken: string;
  };
  markets: string[];
};

type NormalizedGlvEntry = {
  glvToken: string;
  longToken: string;
  shortToken: string;
  markets: string[];
};

type MulticallContractResults = Record<string, ContractCallResult | undefined>;

function createBalanceCalls(
  addresses: string[],
  options: { balanceMethodName?: string; includeDecimals?: boolean } = {}
): Record<string, ContractCallConfig> {
  const { balanceMethodName = "balanceOf", includeDecimals } = options;

  const baseCalls: Record<string, ContractCallConfig> = includeDecimals
    ? {
        decimals: {
          methodName: "decimals",
          params: [],
        },
      }
    : {};

  return addresses.reduce<Record<string, ContractCallConfig>>((calls, account, index) => {
    calls[`balance_${index}`] = {
      methodName: balanceMethodName,
      params: [account],
    };

    return calls;
  }, baseCalls);
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

function extractGlvList(data: Record<string, any> | undefined): GlvListItem[] | undefined {
  const rawList = data?.glvs?.list?.returnValues;

  if (!Array.isArray(rawList)) {
    return undefined;
  }

  return rawList as GlvListItem[];
}

function buildNormalizedGlvEntries(
  chainId: ContractsChainId,
  glvList: GlvListItem[] | undefined,
  marketsData: MarketsData | undefined
): NormalizedGlvEntry[] | undefined {
  if (!glvList || !marketsData) {
    return undefined;
  }

  const glvConfig = GLV_MARKETS[chainId] ?? {};

  const normalized = glvList
    .filter(({ glv }) => Boolean(glvConfig[glv.glvToken]))
    .map(({ glv, markets }) => ({
      glvToken: glv.glvToken,
      longToken: glv.longToken,
      shortToken: glv.shortToken,
      markets: markets.filter((market) => Boolean(marketsData[market])),
    }))
    .filter((entry) => entry.markets.length > 0);

  return normalized.length ? normalized : undefined;
}

function collectTokenEntries({
  chainId,
  tokenAddresses,
  tokenBalancesResponse,
  tokenMap,
  pricesData,
  addressesCount,
}: {
  chainId: ContractsChainId;
  tokenAddresses: string[];
  tokenBalancesResponse?: Record<string, MulticallContractResults | undefined>;
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
  addressesCount: number;
}): { entries: TreasuryBalanceEntry[]; totalUsd: bigint } {
  if (!tokenBalancesResponse) {
    return { entries: [], totalUsd: 0n };
  }

  const entries: TreasuryBalanceEntry[] = [];
  let totalUsd = 0n;

  tokenAddresses.forEach((tokenAddress) => {
    const tokenConfig = tokenMap[tokenAddress];

    if (!tokenConfig) {
      return;
    }

    const balance = sumBalancesFromCalls(tokenBalancesResponse[tokenAddress], addressesCount);

    if (balance === 0n) {
      return;
    }

    const prices = pricesData?.[tokenAddress];
    const usdValue = prices ? convertToUsd(balance, tokenConfig.decimals, getMidPrice(prices)) ?? 0n : 0n;

    if (typeof usdValue === "bigint") {
      totalUsd += usdValue;
    }

    entries.push({
      address: tokenAddress,
      type: "token",
      balance,
      usdValue,
      chainId,
      token: tokenConfig,
      decimals: tokenConfig.decimals,
    });
  });

  return { entries, totalUsd };
}

function collectMarketEntries({
  chainId,
  marketsAddresses,
  marketBalancesResponse,
  addressesCount,
}: {
  chainId: ContractsChainId;
  marketsAddresses?: string[];
  marketBalancesResponse?: Record<string, MulticallContractResults | undefined>;
  addressesCount: number;
}): { entries: TreasuryBalanceEntry[]; totalUsd: bigint } {
  if (!marketBalancesResponse || !marketsAddresses?.length) {
    return { entries: [], totalUsd: 0n };
  }

  const entries: TreasuryBalanceEntry[] = [];
  let totalUsd = 0n;

  marketsAddresses.forEach((marketAddress) => {
    const balancesConfig = marketBalancesResponse[`${marketAddress}-balances`];
    const balance = sumBalancesFromCalls(balancesConfig, addressesCount);

    if (balance === 0n) {
      return;
    }

    const decimalsRaw = balancesConfig?.decimals?.returnValues?.[0];
    const decimals = decimalsRaw !== undefined ? Number(decimalsRaw) : 18;

    let usdValue = 0n;
    const pricesConfig = marketBalancesResponse[`${marketAddress}-prices`];
    const minRaw = pricesConfig?.minPrice?.returnValues?.[0];
    const maxRaw = pricesConfig?.maxPrice?.returnValues?.[0];

    if (minRaw !== undefined && maxRaw !== undefined) {
      const minPrice = typeof minRaw === "bigint" ? minRaw : BigInt(minRaw);
      const maxPrice = typeof maxRaw === "bigint" ? maxRaw : BigInt(maxRaw);
      const price = getMidPrice({ minPrice, maxPrice });
      const usd = convertToUsd(balance, decimals, price);

      if (usd !== undefined) {
        usdValue = usd;
        totalUsd += usd;
      }
    }

    entries.push({
      address: marketAddress,
      type: "gmxV2",
      balance,
      usdValue,
      chainId,
      decimals,
    });
  });

  return { entries, totalUsd };
}

function collectGlvEntries({
  chainId,
  normalizedGlvEntries,
  glvBalancesResponse,
  addressesCount,
  tokensData,
  tokenMap,
}: {
  chainId: ContractsChainId;
  normalizedGlvEntries?: NormalizedGlvEntry[];
  glvBalancesResponse?: Record<string, MulticallContractResults | undefined>;
  addressesCount: number;
  tokensData?: TokensData;
  tokenMap: Record<string, Token>;
}): { entries: TreasuryBalanceEntry[]; totalUsd: bigint } {
  if (!glvBalancesResponse || !normalizedGlvEntries?.length) {
    return { entries: [], totalUsd: 0n };
  }

  const entries: TreasuryBalanceEntry[] = [];
  let totalUsd = 0n;

  normalizedGlvEntries.forEach((entry) => {
    const balancesConfig = glvBalancesResponse[`${entry.glvToken}-balances`];
    const balance = sumBalancesFromCalls(balancesConfig, addressesCount);

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
      const minPrice = typeof minRaw === "bigint" ? minRaw : BigInt(minRaw);
      const maxPrice = typeof maxRaw === "bigint" ? maxRaw : BigInt(maxRaw);
      const price = getMidPrice({ minPrice, maxPrice });
      const usd = convertToUsd(balance, decimals, price);

      if (usd !== undefined) {
        usdValue = usd;
        totalUsd += usd;
      }
    }

    const tokenConfig = tokensData?.[entry.glvToken] ?? tokenMap[entry.glvToken];

    entries.push({
      address: entry.glvToken,
      type: "glv",
      balance,
      usdValue,
      chainId,
      decimals,
      token: tokenConfig,
    });
  });

  return { entries, totalUsd };
}

export type TreasuryData =
  | {
      tokens: TreasuryBalanceEntry[];
      totalUsd: bigint;
    }
  | undefined;

export function useTreasury(chainId: ContractsChainId, _sourceChainId?: SourceChainId): TreasuryData {
  const addresses = TREASURY_ADDRESSES;
  const addressesCount = addresses.length;

  const tokenMap = useMemo(() => getTokensMap(chainId), [chainId]);
  const tokenAddresses = useMemo(() => {
    const uniqueAddresses = new Set<string>();

    (Object.values(tokenMap) as Token[]).forEach((token) => {
      if (token.isSynthetic) {
        return;
      }

      if (token.address.startsWith("0x")) {
        uniqueAddresses.add(token.address);
      }
    });

    return Array.from(uniqueAddresses);
  }, [tokenMap]);

  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const { pricesData } = useTokenRecentPricesRequest(chainId);

  const tokensRequestConfig = useMemo(() => {
    if (!addresses.length || !tokenAddresses.length) {
      return undefined;
    }

    return buildTreasuryTokensRequest({ chainId, addresses, tokenAddresses });
  }, [addresses, chainId, tokenAddresses]);

  const { data: tokenBalancesResponse } = useMulticall(chainId, "useTreasuryTokens", {
    key: tokensRequestConfig ? [chainId, "tokens", addressesCount, tokenAddresses.length] : null,
    request: tokensRequestConfig ?? {},
    parseResponse: (res) => res.data,
  });

  const marketsRequestConfig = useMemo(() => {
    if (!addresses.length || !marketsAddresses?.length || !tokensData) {
      return undefined;
    }

    return buildTreasuryMarketsRequest({
      chainId,
      addresses,
      marketsAddresses: marketsAddresses!,
      tokensData,
      marketsData: marketsData ?? {},
    });
  }, [addresses, chainId, marketsAddresses, marketsData, tokensData]);

  const { data: marketBalancesResponse } = useMulticall(chainId, "useTreasuryMarkets", {
    key:
      marketsRequestConfig && marketsAddresses ? [chainId, "markets", addressesCount, marketsAddresses!.length] : null,
    request: marketsRequestConfig ?? {},
    parseResponse: (res) => res.data,
  });

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

  const normalizedGlvEntries = useMemo(
    () => buildNormalizedGlvEntries(chainId, glvList, marketsData),
    [chainId, glvList, marketsData]
  );

  const glvBalancesConfig = useMemo(() => {
    if (!normalizedGlvEntries || normalizedGlvEntries.length === 0 || !tokensData) {
      return undefined;
    }

    return buildTreasuryGlvRequest({
      chainId,
      addresses,
      glvEntries: normalizedGlvEntries,
      tokensData,
      marketsData: marketsData ?? {},
    });
  }, [addresses, chainId, normalizedGlvEntries, marketsData, tokensData]);

  const { data: glvBalancesResponse } = useMulticall(chainId, "useTreasuryGlv", {
    key: glvBalancesConfig && normalizedGlvEntries ? [chainId, "glv", normalizedGlvEntries.length] : null,
    request: glvBalancesConfig ?? {},
    parseResponse: (res) => res.data,
  });
  const data = useMemo(() => {
    const tokenResult = collectTokenEntries({
      chainId,
      tokenAddresses,
      tokenBalancesResponse,
      tokenMap,
      pricesData,
      addressesCount,
    });

    const marketResult = collectMarketEntries({
      chainId,
      marketsAddresses,
      marketBalancesResponse,
      addressesCount,
    });

    const glvResult = collectGlvEntries({
      chainId,
      normalizedGlvEntries,
      glvBalancesResponse,
      addressesCount,
      tokensData,
      tokenMap,
    });

    const entries = [...tokenResult.entries, ...marketResult.entries, ...glvResult.entries];

    if (!entries.length) {
      return undefined;
    }

    const totalUsd = tokenResult.totalUsd + marketResult.totalUsd + glvResult.totalUsd;

    return {
      tokens: entries,
      totalUsd,
    };
  }, [
    addressesCount,
    chainId,
    glvBalancesResponse,
    marketBalancesResponse,
    marketsAddresses,
    normalizedGlvEntries,
    pricesData,
    tokenAddresses,
    tokenBalancesResponse,
    tokenMap,
    tokensData,
  ]);

  return data;
}

function buildTreasuryTokensRequest({
  chainId,
  addresses,
  tokenAddresses,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenAddresses: string[];
}): TreasuryMulticallRequest {
  const multicallAddress = getContract(chainId, "Multicall");

  return tokenAddresses.reduce((acc, tokenAddress) => {
    const token = getToken(chainId, tokenAddress);
    const isNativeToken = token.address === NATIVE_TOKEN_ADDRESS;

    const calls = createBalanceCalls(addresses, {
      balanceMethodName: isNativeToken ? "getEthBalance" : "balanceOf",
    });

    acc[tokenAddress] = {
      contractAddress: isNativeToken ? multicallAddress : token.address,
      abiId: isNativeToken ? "Multicall" : "Token",
      calls,
    };

    return acc;
  }, {} as TreasuryMulticallRequest);
}

function buildTreasuryMarketsRequest({
  chainId,
  addresses,
  marketsAddresses,
  tokensData,
  marketsData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  marketsAddresses: string[];
  tokensData: TokensData;
  marketsData: MarketsData;
}): TreasuryMulticallRequest {
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
  }, {} as TreasuryMulticallRequest);
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
  } as TreasuryMulticallRequest;
}

function buildTreasuryGlvRequest({
  chainId,
  addresses,
  glvEntries,
  tokensData,
  marketsData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  glvEntries: NormalizedGlvEntry[];
  tokensData: TokensData;
  marketsData: MarketsData;
}): TreasuryMulticallRequest {
  if (!glvEntries.length) {
    return {} as TreasuryMulticallRequest;
  }

  const dataStoreAddress = getContract(chainId, "DataStore");
  const glvReaderAddress = getContract(chainId, "GlvReader");

  return glvEntries.reduce((acc, entry) => {
    const { glvToken, longToken, shortToken, markets } = entry;

    acc[`${glvToken}-balances`] = {
      contractAddress: glvToken,
      abiId: "Token",
      calls: createBalanceCalls(addresses, { includeDecimals: true }),
    };

    const longTokenData = tokensData[longToken];
    const shortTokenData = tokensData[shortToken];

    if (!longTokenData?.prices || !shortTokenData?.prices) {
      return acc;
    }

    const contractGlvPricesLong = convertToContractTokenPrices(longTokenData.prices, longTokenData.decimals);
    const contractGlvPricesShort = convertToContractTokenPrices(shortTokenData.prices, shortTokenData.decimals);

    const validMarkets: string[] = [];
    const marketPriceRanges: [bigint, bigint][] = [];

    markets.forEach((marketAddress) => {
      const market = marketsData[marketAddress];

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
      return acc;
    }

    const glvPricesQuery = [
      dataStoreAddress,
      validMarkets,
      marketPriceRanges,
      [contractGlvPricesLong.min, contractGlvPricesLong.max],
      [contractGlvPricesShort.min, contractGlvPricesShort.max],
      glvToken,
    ] as const;

    acc[`${glvToken}-prices`] = {
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

    return acc;
  }, {} as TreasuryMulticallRequest);
}
