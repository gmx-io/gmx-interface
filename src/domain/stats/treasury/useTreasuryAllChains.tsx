import { ARBITRUM, AVALANCHE, BOTANIX, ContractsChainIdProduction, SOURCE_BASE_MAINNET } from "sdk/configs/chains";

import { TreasuryData, useTreasury } from "./useTreasury";

export function useTreasuryAllChains() {
  const treasuryDataByChain: Record<ContractsChainIdProduction, TreasuryData> = {
    [ARBITRUM]: useTreasury(ARBITRUM, SOURCE_BASE_MAINNET),
    [AVALANCHE]: useTreasury(AVALANCHE, SOURCE_BASE_MAINNET),
    [BOTANIX]: useTreasury(BOTANIX, SOURCE_BASE_MAINNET),
  };

  return combineTreasuryData(treasuryDataByChain);
}

function combineTreasuryData(treasuryDataByChain: Record<ContractsChainIdProduction, TreasuryData>): TreasuryData {
  return Object.values(treasuryDataByChain).reduce((acc, treasuryData): TreasuryData => {
    if (!acc) {
      return treasuryData;
    }

    if (!treasuryData) {
      return acc;
    }

    return {
      totalUsd: acc.totalUsd + treasuryData.totalUsd,
      tokens: acc.tokens.concat(treasuryData.tokens),
    };
  }, undefined);
}
