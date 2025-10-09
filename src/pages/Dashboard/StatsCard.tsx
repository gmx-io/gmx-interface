import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX, ContractsChainIdProduction } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useTotalVolume, useV1FeesInfo } from "domain/stats";
import { useTreasuryAllChains } from "domain/stats/treasury/useTreasuryAllChains";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { formatAmountHuman } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import { MARKETS } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const chainsMap: Record<ContractsChainIdProduction, ContractsChainIdProduction> = {
  [ARBITRUM]: ARBITRUM,
  [AVALANCHE]: AVALANCHE,
  [BOTANIX]: BOTANIX,
};
const chains = Object.values(chainsMap);
const gmxTokenAddresses = chains.map((chain) => getTokenBySymbol(chain, "GMX").address);
const gmGmxTokenAddresses = chains.map((chain) =>
  Object.keys(MARKETS[chain]).filter((address) => {
    return (
      gmxTokenAddresses.includes(MARKETS[chain][address].longTokenAddress) &&
      gmxTokenAddresses.includes(MARKETS[chain][address].shortTokenAddress)
    );
  })
);
const gmxGmAndTokensAddresses = [...gmxTokenAddresses, ...gmGmxTokenAddresses];

export function StatsCard() {
  const v1TotalVolume = useTotalVolume();

  const v2ArbitrumOverview = useV2Stats(ARBITRUM);
  const v2AvalancheOverview = useV2Stats(AVALANCHE);
  const v2BotanixOverview = useV2Stats(BOTANIX);

  const uniqueUsers = useUniqueUsers();

  const v1ArbitrumTotalFees = useV1FeesInfo(ARBITRUM);
  const v1AvalancheTotalFees = useV1FeesInfo(AVALANCHE);
  const totalFeesUsd = sumBigInts(
    v1ArbitrumTotalFees?.totalFees,
    v1AvalancheTotalFees?.totalFees,
    v2ArbitrumOverview.totalFees,
    v2AvalancheOverview.totalFees,
    v2BotanixOverview.totalFees
  );

  // #endregion Fees

  // #region Treasury
  const treasuryData = useTreasuryAllChains();

  const treasuryWithoutGmxUsd = useMemo(() => {
    return treasuryData?.assets
      .filter((asset) => !gmxGmAndTokensAddresses.includes(asset.address))
      .reduce((acc, asset) => acc + asset.usdValue, 0n);
  }, [treasuryData]);

  const gmxInTreasuryUsd = useMemo(() => {
    return treasuryData?.assets
      .filter((asset) => gmxGmAndTokensAddresses.includes(asset.address))
      .reduce((acc, asset) => acc + asset.usdValue, 0n);
  }, [treasuryData]);

  // #endregion Treasury

  const totalFeesEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumOverview?.totalFees,
      "V2 Avalanche": v2AvalancheOverview?.totalFees,
      "V2 Botanix": v2BotanixOverview?.totalFees,
      "V1 Arbitrum": v1ArbitrumTotalFees?.totalFees,
      "V1 Avalanche": v1AvalancheTotalFees?.totalFees,
    }),
    [
      v1AvalancheTotalFees?.totalFees,
      v1ArbitrumTotalFees?.totalFees,
      v2ArbitrumOverview?.totalFees,
      v2AvalancheOverview?.totalFees,
      v2BotanixOverview?.totalFees,
    ]
  );

  const totalVolumeEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumOverview?.totalVolume,
      "V2 Avalanche": v2AvalancheOverview?.totalVolume,
      "V2 Botanix": v2BotanixOverview?.totalVolume,
      "V1 Arbitrum": v1TotalVolume?.[ARBITRUM],
      "V1 Avalanche": v1TotalVolume?.[AVALANCHE],
    }),
    [v1TotalVolume, v2ArbitrumOverview?.totalVolume, v2AvalancheOverview?.totalVolume, v2BotanixOverview?.totalVolume]
  );

  const uniqueUsersEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumOverview?.totalUsers,
      "V2 Avalanche": v2AvalancheOverview?.totalUsers,
      "V2 Botanix": v2BotanixOverview?.totalUsers,
      "V1 Arbitrum": uniqueUsers?.[ARBITRUM],
      "V1 Avalanche": uniqueUsers?.[AVALANCHE],
    }),
    [uniqueUsers, v2ArbitrumOverview?.totalUsers, v2AvalancheOverview?.totalUsers, v2BotanixOverview?.totalUsers]
  );

  return (
    <AppCard>
      <AppCardSection className="text-body-large font-medium">
        <Trans>Stats</Trans>
      </AppCardSection>
      <AppCardSection>
        <div className="App-card-row">
          <div className="label">
            <Trans>Fees</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={formatAmountHuman(totalFeesUsd, USD_DECIMALS, true, 2)}
              handleClassName="numbers"
              content={<ChainsStatsTooltipRow entries={totalFeesEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Volume</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={formatAmountHuman(
                sumBigInts(
                  v1TotalVolume?.[ARBITRUM],
                  v1TotalVolume?.[AVALANCHE],
                  v1TotalVolume?.[BOTANIX],
                  v2ArbitrumOverview?.totalVolume,
                  v2AvalancheOverview?.totalVolume,
                  v2BotanixOverview?.totalVolume
                ),
                USD_DECIMALS,
                true,
                2
              )}
              handleClassName="numbers"
              content={<ChainsStatsTooltipRow entries={totalVolumeEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Users</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={formatAmountHuman(
                sumBigInts(
                  uniqueUsers?.[ARBITRUM],
                  uniqueUsers?.[AVALANCHE],
                  uniqueUsers?.[BOTANIX],
                  v2ArbitrumOverview?.totalUsers,
                  v2AvalancheOverview?.totalUsers,
                  v2BotanixOverview?.totalUsers
                ),
                0,
                false,
                2
              )}
              handleClassName="numbers"
              content={
                <ChainsStatsTooltipRow showDollar={false} entries={uniqueUsersEntries} decimalsForConversion={0} />
              }
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Treasury</Trans>
          </div>
          <div>
            <TooltipWithPortal
              handle={formatAmountHuman(treasuryData?.totalUsd, USD_DECIMALS, true, 2)}
              handleClassName="numbers"
              position="bottom-end"
              content={
                <div>
                  <StatsTooltipRow
                    label={<Trans>In other tokens:</Trans>}
                    value={formatAmountHuman(treasuryWithoutGmxUsd, USD_DECIMALS, false, 2)}
                  />
                  <StatsTooltipRow
                    label={<Trans>In GMX:</Trans>}
                    value={formatAmountHuman(gmxInTreasuryUsd, USD_DECIMALS, false, 2)}
                  />
                </div>
              }
            />
          </div>
        </div>
      </AppCardSection>
    </AppCard>
  );
}
