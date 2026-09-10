import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, MEGAETH, ContractsChainIdProduction } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { isProtocolStatsNetworkStale, useProtocolStatsSummary } from "domain/protocolStats/useProtocolStatsSummary";
import { parseProtocolStatsUsd } from "domain/protocolStats/utils";
import { useTotalVolume, useV1FeesInfo } from "domain/stats";
import { useTreasuryAllChains } from "domain/stats/treasury/useTreasuryAllChains";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { formatAmountHuman } from "lib/numbers";
import { sumKnownBigInts } from "lib/sumBigInts";
import { MARKETS } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import ChainsStatsTooltip from "components/StatsTooltip/ChainsStatsTooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const chains: ContractsChainIdProduction[] = [ARBITRUM, AVALANCHE, MEGAETH];
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

const SOLANA_ENTRY = "Solana";

export function StatsCard() {
  const v1TotalVolume = useTotalVolume();

  const v2ArbitrumOverview = useV2Stats(ARBITRUM);
  const v2AvalancheOverview = useV2Stats(AVALANCHE);
  const v2MegaethOverview = useV2Stats(MEGAETH);
  const gmtradeSummary = useProtocolStatsSummary({ networks: ["solana"] });
  const gmtradeStats = gmtradeSummary.data?.byNetwork.solana;
  const staleTitles = isProtocolStatsNetworkStale(gmtradeSummary.data, "solana") ? [SOLANA_ENTRY] : [];
  const gmtradeTotalFees = parseProtocolStatsUsd(gmtradeStats?.fees.total);
  const gmtradeTotalVolume = parseProtocolStatsUsd(gmtradeStats?.volume.total);
  // users.all counts a wallet on its first action of any kind, the same basis as the V2 totalUsers entries
  const gmtradeUsers = gmtradeStats?.users.all ?? undefined;

  const uniqueUsers = useUniqueUsers();

  const v1ArbitrumTotalFees = useV1FeesInfo(ARBITRUM);
  const v1AvalancheTotalFees = useV1FeesInfo(AVALANCHE);

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
      Arbitrum: sumKnownBigInts(v2ArbitrumOverview?.totalFees, v1ArbitrumTotalFees?.totalFees),
      Avalanche: sumKnownBigInts(v2AvalancheOverview?.totalFees, v1AvalancheTotalFees?.totalFees),
      MegaETH: v2MegaethOverview?.totalFees,
      [SOLANA_ENTRY]: gmtradeTotalFees,
    }),
    [
      v1AvalancheTotalFees?.totalFees,
      v1ArbitrumTotalFees?.totalFees,
      v2ArbitrumOverview?.totalFees,
      v2AvalancheOverview?.totalFees,
      v2MegaethOverview?.totalFees,
      gmtradeTotalFees,
    ]
  );

  const totalVolumeEntries = useMemo(
    () => ({
      Arbitrum: sumKnownBigInts(v2ArbitrumOverview?.totalVolume, v1TotalVolume?.[ARBITRUM]),
      Avalanche: sumKnownBigInts(v2AvalancheOverview?.totalVolume, v1TotalVolume?.[AVALANCHE]),
      MegaETH: v2MegaethOverview?.totalVolume,
      [SOLANA_ENTRY]: gmtradeTotalVolume,
    }),
    [
      v1TotalVolume,
      v2ArbitrumOverview?.totalVolume,
      v2AvalancheOverview?.totalVolume,
      v2MegaethOverview?.totalVolume,
      gmtradeTotalVolume,
    ]
  );

  const uniqueUsersEntries = useMemo(
    () => ({
      Arbitrum: sumKnownBigInts(v2ArbitrumOverview?.totalUsers, uniqueUsers?.[ARBITRUM]),
      Avalanche: sumKnownBigInts(v2AvalancheOverview?.totalUsers, uniqueUsers?.[AVALANCHE]),
      MegaETH: v2MegaethOverview?.totalUsers,
      [SOLANA_ENTRY]: gmtradeUsers,
    }),
    [
      gmtradeUsers,
      uniqueUsers,
      v2ArbitrumOverview?.totalUsers,
      v2AvalancheOverview?.totalUsers,
      v2MegaethOverview?.totalUsers,
    ]
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
            <ChainsStatsTooltip entries={totalFeesEntries} staleTitles={staleTitles} />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Volume</Trans>
          </div>
          <div>
            <ChainsStatsTooltip entries={totalVolumeEntries} staleTitles={staleTitles} />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Users</Trans>
          </div>
          <div>
            <ChainsStatsTooltip
              entries={uniqueUsersEntries}
              staleTitles={staleTitles}
              showDollar={false}
              decimalsForConversion={0}
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
