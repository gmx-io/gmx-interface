import { ARBITRUM, AVALANCHE, BOTANIX, ContractsChainIdProduction } from "sdk/configs/chains";

import { TreasuryData, useTreasury } from "./useTreasury";

export function useTreasuryAllChains() {
  const treasuryDataByChain: Record<ContractsChainIdProduction, TreasuryData> = {
    [ARBITRUM]: useTreasury(ARBITRUM),
    [AVALANCHE]: useTreasury(AVALANCHE),
    [BOTANIX]: useTreasury(BOTANIX),
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
