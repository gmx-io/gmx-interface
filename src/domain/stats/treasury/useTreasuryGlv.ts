import { useMemo } from "react";

import { getContract } from "config/contracts";
import { GLV_MARKETS } from "config/markets";
import { getContractMarketPrices } from "domain/synthetics/markets/utils";
import { convertToContractTokenPrices } from "domain/synthetics/tokens";
import type { TokensData } from "domain/synthetics/tokens";
import { useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import type { MarketsData } from "sdk/types/markets";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import { createBalanceCalls, sumBalancesFromCalls } from "./shared";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

type GlvListItem = {
  glv: {
    glvToken: string;
    longToken: string;
    shortToken: string;
  };
  markets: string[];
};

type GlvAsset = {
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
}): TreasuryData | undefined {
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

  const glvAssetsData = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }

    if (!glvList?.length || glvListConfig === undefined) {
      return { assets: [], request: undefined };
    }

    return buildTreasuryGlvRequest({
      chainId,
      addresses,
      glvList,
      tokensData,
      marketsData: marketsData ?? {},
    });
  }, [addresses, chainId, glvList, glvListConfig, marketsData, tokensData]);

  const glvAssets = glvAssetsData?.assets;
  const glvBalancesConfig = glvAssetsData?.request;
  const glvAssetsCount = glvAssets?.length ?? 0;

  const { data: glvBalancesResponse } = useMulticall(chainId, "useTreasuryGlv", {
    key: glvBalancesConfig && glvAssetsCount ? [chainId, "glv", glvAssetsCount] : null,
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

    if (!glvBalancesResponse || !glvAssets?.length || glvListConfig === undefined) {
      return TREASURY_EMPTY_RESULT;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    glvAssets.forEach((asset) => {
      const balancesConfig = glvBalancesResponse[`${asset.glvToken}-balances`];
      const balance = sumBalancesFromCalls(balancesConfig, addresses.length);

      if (balance === 0n) {
        return;
      }

      const decimalsValue = balancesConfig?.decimals?.returnValues?.[0];
      const decimals = decimalsValue !== undefined ? Number(decimalsValue) : 18;

      let usdValue = 0n;
      const pricesConfig = glvBalancesResponse[`${asset.glvToken}-prices`];
      const minPrice = pricesConfig?.glvTokenPriceMin?.returnValues?.[0];
      const maxPrice = pricesConfig?.glvTokenPriceMax?.returnValues?.[0];

      if (minPrice !== undefined && maxPrice !== undefined) {
        const price = getMidPrice({ minPrice, maxPrice });
        const usd = convertToUsd(balance, decimals, price);

        if (usd !== undefined) {
          usdValue = usd;
          totalUsd += usd;
        }
      }

      assets.push({
        address: asset.glvToken,
        type: "glv",
        balance,
        usdValue,
        chainId,
        decimals,
      });
    });

    return { assets, totalUsd };
  }, [
    tokensData,
    marketsData,
    glvBalancesConfig,
    glvBalancesResponse,
    glvAssets,
    glvListConfig,
    addresses.length,
    chainId,
  ]);
}

function extractGlvList(data: Record<string, any> | undefined): GlvListItem[] | undefined {
  const list = data?.glvs?.list?.returnValues;

  if (!Array.isArray(list)) {
    return undefined;
  }

  return list;
}

function buildTreasuryGlvListRequest(chainId: ContractsChainId) {
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
}) {
  const glvConfig = GLV_MARKETS[chainId] ?? {};
  const dataStoreAddress = getContract(chainId, "DataStore");
  const glvReaderAddress = getContract(chainId, "GlvReader");

  const request = {};
  const assets: GlvAsset[] = [];

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
      return;
    }

    assets.push({
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
    assets,
    request: assets.length ? request : undefined,
  };
}
