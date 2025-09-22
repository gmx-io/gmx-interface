import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useTotalVolume, useV1FeesInfo } from "domain/stats";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { GLP_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmountHuman } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import useWallet from "lib/wallets/useWallet";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

import type { ChainStats } from "./useDashboardChainStatsMulticall";

const ethTreasuryFund = expandDecimals(350 + 148 + 384, 18);
const glpTreasuryFund = expandDecimals(660001, 18);
const usdcTreasuryFund = expandDecimals(784598 + 200000, 30);

export function StatsCard({
  statsArbitrum,
  statsAvalanche,
}: {
  statsArbitrum?: ChainStats;
  statsAvalanche?: ChainStats;
}) {
  const { active } = useWallet();
  const { chainId } = useChainId();
  const v1TotalVolume = useTotalVolume();

  const v2ArbitrumOverview = useV2Stats(ARBITRUM);
  const v2AvalancheOverview = useV2Stats(AVALANCHE);
  const v2BotanixOverview = useV2Stats(BOTANIX);

  const uniqueUsers = useUniqueUsers();

  const suppliesArbitrum = statsArbitrum?.reader.tokenBalancesWithSupplies;
  const suppliesAvalanche = statsAvalanche?.reader.tokenBalancesWithSupplies;

  const { infoTokens: infoTokensArbitrum } = useInfoTokens(undefined, ARBITRUM, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(undefined, AVALANCHE, active, undefined, undefined);
  const infoTokens = chainId === ARBITRUM ? infoTokensArbitrum : infoTokensAvax;
  const eth = infoTokens[getTokenBySymbol(chainId === ARBITRUM ? ARBITRUM : AVALANCHE, "ETH").address];

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
  const glpTvlArbitrum = statsArbitrum?.glp.aum;
  const glpTvlAvalanche = statsAvalanche?.glp.aum;

  const glpTvl = chainId === ARBITRUM ? glpTvlArbitrum : glpTvlAvalanche;

  const glpSupplyArbitrum = suppliesArbitrum?.glpSupply;
  const glpSupplyAvalanche = suppliesAvalanche?.glpSupply;

  const glpSupply = chainId === ARBITRUM ? glpSupplyArbitrum : glpSupplyAvalanche;

  const glpPrice =
    glpTvl !== undefined && glpTvl > 0n && glpSupply !== undefined
      ? bigMath.mulDiv(glpTvl, expandDecimals(1, GLP_DECIMALS), glpSupply)
      : expandDecimals(1, USD_DECIMALS);

  let totalTreasuryFundUsd: bigint | undefined = undefined;

  if (eth && eth.contractMinPrice !== undefined && glpPrice !== undefined) {
    const ethTreasuryFundUsd = bigMath.mulDiv(ethTreasuryFund, eth.contractMinPrice, expandDecimals(1, eth.decimals));

    const glpTreasuryFundUsd = bigMath.mulDiv(glpTreasuryFund, glpPrice, expandDecimals(1, 18));

    totalTreasuryFundUsd = ethTreasuryFundUsd + glpTreasuryFundUsd + usdcTreasuryFund;
  }

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
            <span className="numbers">{formatAmountHuman(totalTreasuryFundUsd, USD_DECIMALS, true, 2)}</span>
          </div>
        </div>
      </AppCardSection>
    </AppCard>
  );
}
