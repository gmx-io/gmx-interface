import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, MEGAETH, ContractsChainIdProduction } from "sdk/configs/chains";

import { TreasuryData, useTreasury } from "./useTreasury";

export function useTreasuryAllChains() {
  const arbitrumTreasuryData = useTreasury(ARBITRUM);
  const avalancheTreasuryData = useTreasury(AVALANCHE);
  const megaethTreasuryData = useTreasury(MEGAETH);

  return useMemo(
    () =>
      combineTreasuryData({
        [ARBITRUM]: arbitrumTreasuryData,
        [AVALANCHE]: avalancheTreasuryData,
        [MEGAETH]: megaethTreasuryData,
      }),
    [arbitrumTreasuryData, avalancheTreasuryData, megaethTreasuryData]
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
