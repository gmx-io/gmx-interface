import type { QueryFunction } from "@taskworld.com/rereselect";

import { ARBITRUM, AVALANCHE, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getContract } from "config/contracts";
import { getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { getInfoTokens } from "domain/tokens";
import { InfoTokens } from "domain/tokens/types";
import { OptInV2ContextType, createOptInV2Selector } from "./OptInV2ContextProvider";

const selectFlags = createOptInV2Selector((q) => {
  return q((state) => state.flags);
});

function warn(q: QueryFunction<OptInV2ContextType>, ...keys: (keyof OptInV2ContextType["flags"])[]): void {
  const flags = q(selectFlags);

  for (const key of keys) {
    if (!flags[key]) {
      // eslint-disable-next-line no-console
      console.warn(`[optInSelectors] ${key} is not enabled`);
    }
  }
}

export const selectGmxPrices = createOptInV2Selector((q) => {
  warn(q, "withGmxPrice", "withSecondaryGmxPrices", "withNativeTokenMinPrice");

  const chainId = q((state) => state.chainId);

  const gmxPriceFromArbitrum = q((state) => state.gmxPriceMap?.[ARBITRUM]);
  const gmxPriceFromAvalanche = q((state) => state.gmxPriceMap?.[AVALANCHE]);

  const gmxPrice = chainId === ARBITRUM ? gmxPriceFromArbitrum : gmxPriceFromAvalanche;

  return {
    gmxPrice,
    gmxPriceFromArbitrum,
    gmxPriceFromAvalanche,
  };
});

export const selectTotalGmxInLiquidity = createOptInV2Selector((q) => {
  warn(q, "withSecondaryGmxLiquidiyBalances");

  const gmxLiquidityFromArbitrum = q((state) => state.gmxLiquidityMap?.[ARBITRUM]);
  const gmxLiquidityFromAvalanche = q((state) => state.gmxLiquidityMap?.[AVALANCHE]);

  const total = (gmxLiquidityFromArbitrum ?? 0n) + (gmxLiquidityFromAvalanche ?? 0n);

  return {
    total,
    [ARBITRUM]: gmxLiquidityFromArbitrum,
    [AVALANCHE]: gmxLiquidityFromAvalanche,
  };
});

export const selectTotalGmxStaked = createOptInV2Selector((q) => {
  warn(q, "withSecondaryGmxStakedBalances");

  const gmxStakedMap = q((state) => state.gmxStakedMap) || {};

  const total = (gmxStakedMap?.[ARBITRUM] ?? 0n) + (gmxStakedMap?.[AVALANCHE] ?? 0n);

  return {
    total,
    ...gmxStakedMap,
  } as Record<number | "total", bigint>;
});

export const selectInfoTokensMap = createOptInV2Selector((q) => {
  warn(q, "withSecondaryVaultTokenInfo", "withVaultTokenInfo", "withSecondaryVaultTokenInfo");

  const pricesMap = q((state) => state.pricesMap);

  const vaultTokenInfoMap = q((state) => state.vaultTokenInfoMap);

  const infoTokensMap: Record<number, InfoTokens> = {};

  for (const chainId of SUPPORTED_CHAIN_IDS) {
    const tokens = getV1Tokens(chainId);
    const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
    const whitelistedTokens = getWhitelistedV1Tokens(chainId);

    const indexPrices = pricesMap?.[chainId];
    const vaultTokenInfo = vaultTokenInfoMap?.[chainId];

    const infoTokens = getInfoTokens({
      tokens,
      nativeTokenAddress,
      whitelistedTokens,
      indexPrices,
      vaultTokenInfo,
    });

    infoTokensMap[chainId] = infoTokens;
  }

  return infoTokensMap;
});

export const selectAums = createOptInV2Selector((q) => {
  warn(q, "withAums");

  const aums = q((state) => state.aums);

  return aums;
});

export const selectFeesMap = createOptInV2Selector((q) => {
  warn(q, "withFees", "withSecondaryFees");

  const feesMap = q((state) => state.feesMap);

  return feesMap;
});

export const selectTokenBalancesWithSuppliesSupplies = createOptInV2Selector((q) => {
  warn(q, "withTokenBalancesWithSupplies");

  const totalSupplies = q((state) => state.tokenBalancesWithSupplies);

  return totalSupplies;
});

export const selectTotalTokenWeights = createOptInV2Selector((q) => {
  warn(q, "withTotalTokenWeights");

  const totalTokenWeights = q((state) => state.totalTokenWeights);

  return totalTokenWeights;
});
