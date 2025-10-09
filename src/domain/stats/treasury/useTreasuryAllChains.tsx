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
  const results = Object.values(treasuryDataByChain);

  const definedResults = results.filter(
    (treasuryData): treasuryData is Exclude<TreasuryData, undefined> => treasuryData !== undefined
  );

  if (definedResults.length !== results.length) {
    return undefined;
  }

  return definedResults.reduce(
    (acc, treasuryData) => ({
      totalUsd: acc.totalUsd + treasuryData.totalUsd,
      assets: acc.assets.concat(treasuryData.assets),
    }),
    { totalUsd: 0n, assets: [] }
  );
}
