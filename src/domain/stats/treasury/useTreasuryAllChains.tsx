import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX, ContractsChainIdProduction } from "sdk/configs/chains";

import { TreasuryData, useTreasury } from "./useTreasury";

export function useTreasuryAllChains() {
  const arbitrumTreasuryData = useTreasury(ARBITRUM);
  const avalancheTreasuryData = useTreasury(AVALANCHE);
  const botanixTreasuryData = useTreasury(BOTANIX);

  return useMemo(
    () =>
      combineTreasuryData({
        [ARBITRUM]: arbitrumTreasuryData,
        [AVALANCHE]: avalancheTreasuryData,
        [BOTANIX]: botanixTreasuryData,
      }),
    [arbitrumTreasuryData, avalancheTreasuryData, botanixTreasuryData]
  );
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
