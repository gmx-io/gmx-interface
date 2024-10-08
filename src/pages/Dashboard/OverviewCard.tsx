import { Trans } from "@lingui/macro";
import { formatDistanceToNowStrict } from "date-fns";
import { useMemo } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useTotalGmxStaked } from "domain/legacy";
import { useFeesSummary, useVolumeInfo } from "domain/stats";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useInfoTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { arrayURLFetcher } from "lib/fetcher";
import { GLP_DECIMALS, GMX_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import useWallet from "lib/wallets/useWallet";
import { ACTIVE_CHAIN_IDS } from "./DashboardV2";
import { getCurrentFeesUsd } from "./getCurrentFeesUsd";
import { getPositionStats } from "./getPositionStats";
import { getWhitelistedTokenAddresses } from "./getWhitelistedTokenAddresses";
import type { ChainStats } from "./useDashboardChainStatsMulticall";

import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";
import { useGmxPrice } from "domain/synthetics/tokens";

export function OverviewCard({
  statsArbitrum,
  statsAvalanche,
}: {
  statsArbitrum?: ChainStats;
  statsAvalanche?: ChainStats;
}) {
  const { active } = useWallet();
  const { chainId } = useChainId();

  const v2ArbitrumOverview = useV2Stats(ARBITRUM);
  const v2AvalancheOverview = useV2Stats(AVALANCHE);

  const { data: positionStats } = useSWR<
    {
      totalActivePositions: number;
      totalLongPositionSizes: string;
      totalLongPositionCollaterals: string;
      totalShortPositionCollaterals: string;
      totalShortPositionSizes: string;
      openInterest: bigint;
    }[]
  >(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/position_stats")),
    {
      fetcher: arrayURLFetcher,
    }
  );

  const positionStatsInfo = getPositionStats(positionStats);

  const { infoTokens: infoTokensArbitrum } = useInfoTokens(undefined, ARBITRUM, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(undefined, AVALANCHE, active, undefined, undefined);

  const v1Fees = useMemo(() => {
    if (!statsArbitrum?.reader?.fees || !statsAvalanche?.reader?.fees) {
      return undefined;
    }
    const feeUsdArbitrum = getCurrentFeesUsd(
      getWhitelistedTokenAddresses(ARBITRUM),
      statsArbitrum.reader.fees,
      infoTokensArbitrum
    );

    const feeUsdAvalanche = getCurrentFeesUsd(
      getWhitelistedTokenAddresses(AVALANCHE),
      statsAvalanche.reader.fees,
      infoTokensAvax
    );

    return {
      total: feeUsdArbitrum + feeUsdAvalanche,
      [ARBITRUM]: feeUsdArbitrum,
      [AVALANCHE]: feeUsdAvalanche,
    };
  }, [statsArbitrum?.reader.fees, statsAvalanche?.reader.fees, infoTokensArbitrum, infoTokensAvax]);

  const { data: feesSummaryByChain } = useFeesSummary();

  const { gmxPrice } = useGmxPrice(chainId);

  let { [AVALANCHE]: stakedGmxAvalanche, [ARBITRUM]: stakedGmxArbitrum } = useTotalGmxStaked();

  // #region TVL and GLP Pool
  const glpTvlArbitrum = statsArbitrum?.glp.aum;
  const glpTvlAvalanche = statsAvalanche?.glp.aum;

  const glpSupplyArbitrum = statsArbitrum?.reader?.tokenBalancesWithSupplies?.glpSupply;
  const glpSupplyAvalanche = statsAvalanche?.reader?.tokenBalancesWithSupplies?.glpSupply;

  const glpPriceArbitrum =
    glpTvlArbitrum !== undefined && glpTvlArbitrum > 0n && glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(glpTvlArbitrum, expandDecimals(1, GLP_DECIMALS), glpSupplyArbitrum)
      : expandDecimals(1, USD_DECIMALS);

  const glpPriceAvalanche =
    glpTvlAvalanche !== undefined && glpTvlAvalanche > 0n && glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(glpTvlAvalanche, expandDecimals(1, GLP_DECIMALS), glpSupplyAvalanche)
      : expandDecimals(1, USD_DECIMALS);

  const glpMarketCapArbitrum =
    glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(glpPriceArbitrum, glpSupplyArbitrum, expandDecimals(1, GLP_DECIMALS))
      : undefined;

  const glpMarketCapAvalanche =
    glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(glpPriceAvalanche, glpSupplyAvalanche, expandDecimals(1, GLP_DECIMALS))
      : undefined;

  const totalGlpTvl =
    glpTvlArbitrum !== undefined && glpTvlAvalanche !== undefined ? glpTvlArbitrum + glpTvlAvalanche : undefined;

  const gmTvlArbitrum = v2ArbitrumOverview.totalGMLiquidity;
  const gmTvlAvalanche = v2AvalancheOverview.totalGMLiquidity;

  const totalGmTvl = gmTvlArbitrum + gmTvlAvalanche;

  let displayTvlArbitrum: bigint | undefined = undefined;
  let displayTvlAvalanche: bigint | undefined = undefined;
  let displayTvl: bigint | undefined = undefined;
  if (
    gmxPrice !== undefined &&
    stakedGmxArbitrum !== undefined &&
    stakedGmxAvalanche !== undefined &&
    glpMarketCapArbitrum !== undefined &&
    glpMarketCapAvalanche !== undefined
  ) {
    const stakedGmxUsdArbitrum = bigMath.mulDiv(gmxPrice, stakedGmxArbitrum, expandDecimals(1, GMX_DECIMALS));
    const stakedGmxUsdAvalanche = bigMath.mulDiv(gmxPrice, stakedGmxAvalanche, expandDecimals(1, GMX_DECIMALS));

    // GMX Staked + GLP Pools + GM Pools
    displayTvlArbitrum = stakedGmxUsdArbitrum + glpMarketCapArbitrum + gmTvlArbitrum;
    displayTvlAvalanche = stakedGmxUsdAvalanche + glpMarketCapAvalanche + gmTvlAvalanche;
    displayTvl = displayTvlArbitrum + displayTvlAvalanche;
  }

  // #endregion TVL and GLP Pool

  // #region Daily Volume
  const v1DailyVolumeInfo = useVolumeInfo();
  const v1ArbitrumDailyVolume = v1DailyVolumeInfo?.[ARBITRUM];
  const v1AvalancheDailyVolume = v1DailyVolumeInfo?.[AVALANCHE];

  const v2ArbitrumDailyVolume = v2ArbitrumOverview.dailyVolume;
  const v2AvalancheDailyVolume = v2AvalancheOverview.dailyVolume;

  const totalDailyVolume = sumBigInts(
    v1ArbitrumDailyVolume,
    v1AvalancheDailyVolume,
    v2ArbitrumDailyVolume,
    v2AvalancheDailyVolume
  );
  // #endregion Daily Volume

  const feesSummary = feesSummaryByChain[chainId];

  // #region Open Interest
  const v1ArbitrumOpenInterest = positionStatsInfo?.[ARBITRUM]?.openInterest;
  const v1AvalancheOpenInterest = positionStatsInfo?.[AVALANCHE]?.openInterest;
  const v2ArbitrumOpenInterest = v2ArbitrumOverview.openInterest;
  const v2AvalancheOpenInterest = v2AvalancheOverview.openInterest;

  const totalOpenInterest = sumBigInts(
    v1ArbitrumOpenInterest,
    v1AvalancheOpenInterest,
    v2ArbitrumOpenInterest,
    v2AvalancheOpenInterest
  );
  // #endregion Open Interest

  // #region Long Position Sizes
  const v1ArbitrumLongPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalLongPositionSizes;
  const v1AvalancheLongPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalLongPositionSizes;

  const v2ArbitrumLongPositionSizes = v2ArbitrumOverview.totalLongPositionSizes;
  const v2AvalancheLongPositionSizes = v2AvalancheOverview.totalLongPositionSizes;

  const totalLongPositionSizes = sumBigInts(
    v1ArbitrumLongPositionSizes,
    v1AvalancheLongPositionSizes,
    v2ArbitrumLongPositionSizes,
    v2AvalancheLongPositionSizes
  );
  // #endregion Long Position Sizes

  // #region Short Position Sizes
  const v1ArbitrumShortPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalShortPositionSizes;
  const v1AvalancheShortPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalShortPositionSizes;

  const v2ArbitrumShortPositionSizes = v2ArbitrumOverview.totalShortPositionSizes;
  const v2AvalancheShortPositionSizes = v2AvalancheOverview.totalShortPositionSizes;

  const totalShortPositionSizes = sumBigInts(
    v1ArbitrumShortPositionSizes,
    v1AvalancheShortPositionSizes,
    v2ArbitrumShortPositionSizes,
    v2AvalancheShortPositionSizes
  );
  // #endregion Short Position Sizes

  // #region Fees
  const v1ArbitrumWeeklyFees = v1Fees?.[ARBITRUM];
  const v1AvalancheWeeklyFees = v1Fees?.[AVALANCHE];

  const v2ArbitrumWeeklyFees = v2ArbitrumOverview?.weeklyFees;
  const v2AvalancheWeeklyFees = v2AvalancheOverview?.weeklyFees;

  const totalWeeklyFeesUsd = sumBigInts(
    v1ArbitrumWeeklyFees,
    v1AvalancheWeeklyFees,
    v2ArbitrumWeeklyFees,
    v2AvalancheWeeklyFees
  );
  // #endregion Fees

  const dailyVolumeEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumDailyVolume,
      "V2 Arbitrum": v2ArbitrumOverview?.dailyVolume,
      "V1 Avalanche": v1AvalancheDailyVolume,
      "V2 Avalanche": v2AvalancheOverview?.dailyVolume,
    }),
    [v1ArbitrumDailyVolume, v1AvalancheDailyVolume, v2ArbitrumOverview?.dailyVolume, v2AvalancheOverview?.dailyVolume]
  );

  const openInterestEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumOpenInterest,
      "V2 Arbitrum": v2ArbitrumOpenInterest,
      "V1 Avalanche": v1AvalancheOpenInterest,
      "V2 Avalanche": v2AvalancheOpenInterest,
    }),
    [v1ArbitrumOpenInterest, v1AvalancheOpenInterest, v2ArbitrumOpenInterest, v2AvalancheOpenInterest]
  );

  const totalLongPositionSizesEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumLongPositionSizes,
      "V2 Arbitrum": v2ArbitrumLongPositionSizes,
      "V1 Avalanche": v1AvalancheLongPositionSizes,
      "V2 Avalanche": v2AvalancheLongPositionSizes,
    }),
    [
      v1ArbitrumLongPositionSizes,
      v1AvalancheLongPositionSizes,
      v2ArbitrumLongPositionSizes,
      v2AvalancheLongPositionSizes,
    ]
  );

  const totalShortPositionSizesEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumShortPositionSizes,
      "V2 Arbitrum": v2ArbitrumShortPositionSizes,
      "V1 Avalanche": v1AvalancheShortPositionSizes,
      "V2 Avalanche": v2AvalancheShortPositionSizes,
    }),
    [
      v1ArbitrumShortPositionSizes,
      v1AvalancheShortPositionSizes,
      v2ArbitrumShortPositionSizes,
      v2AvalancheShortPositionSizes,
    ]
  );

  const weeklyFeesEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumWeeklyFees,
      "V2 Arbitrum": v2ArbitrumWeeklyFees,
      "V1 Avalanche": v1AvalancheWeeklyFees,
      "V2 Avalanche": v2AvalancheWeeklyFees,
    }),
    [v1ArbitrumWeeklyFees, v1AvalancheWeeklyFees, v2ArbitrumWeeklyFees, v2AvalancheWeeklyFees]
  );

  return (
    <div className="App-card">
      <div className="App-card-title">
        <Trans>Overview</Trans>
      </div>
      <div className="App-card-divider"></div>
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>TVL</Trans>
          </div>
          <div>
            <TooltipComponent
              handle={`$${formatAmount(displayTvl, USD_DECIMALS, 0, true)}`}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value locked takes into account:</Trans>
                  <br />
                  <ul className="my-8 list-disc">
                    <li className="p-2">GMX Staked</li>
                    <li className="p-2">GLP Pool</li>
                    <li className="p-2">GM Pools</li>
                  </ul>
                  <StatsTooltipRow label="Arbitrum" value={formatAmount(displayTvlArbitrum, USD_DECIMALS, 0, true)} />
                  <StatsTooltipRow label="Avalanche" value={formatAmount(displayTvlAvalanche, USD_DECIMALS, 0, true)} />
                  <div className="!my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow label="Total" value={formatAmount(displayTvl, USD_DECIMALS, 0, true)} />
                </>
              }
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>GLP Pool</Trans>
          </div>
          <div>
            <TooltipComponent
              handle={`$${formatAmount(totalGlpTvl, USD_DECIMALS, 0, true)}`}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value of tokens in the GLP pools.</Trans>
                  <br />
                  <br />
                  <StatsTooltipRow label="Arbitrum" value={formatAmount(glpTvlArbitrum, USD_DECIMALS, 0, true)} />
                  <StatsTooltipRow label="Avalanche" value={formatAmount(glpTvlAvalanche, USD_DECIMALS, 0, true)} />
                  <div className="my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow label="Total" value={formatAmount(totalGlpTvl, USD_DECIMALS, 0, true)} />
                  <br />
                  <Trans>
                    This value may be higher on other websites due to the collateral of positions being included in the
                    calculation.
                  </Trans>
                </>
              }
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>GM Pools</Trans>
          </div>
          <div>
            <TooltipComponent
              handle={`$${formatAmount(totalGmTvl, USD_DECIMALS, 0, true)}`}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value of tokens in GM Pools.</Trans>
                  <br />
                  <br />
                  <StatsTooltipRow label="Arbitrum" value={formatAmount(gmTvlArbitrum, USD_DECIMALS, 0, true)} />
                  <StatsTooltipRow label="Avalanche" value={formatAmount(gmTvlAvalanche, USD_DECIMALS, 0, true)} />
                  <div className="!my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow label="Total" value={formatAmount(totalGmTvl, USD_DECIMALS, 0, true)} />
                </>
              }
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>24h Volume</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(totalDailyVolume, USD_DECIMALS, 0, true)}`}
              content={<ChainsStatsTooltipRow entries={dailyVolumeEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Open Interest</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(totalOpenInterest, USD_DECIMALS, 0, true)}`}
              content={<ChainsStatsTooltipRow entries={openInterestEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Long Positions</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}`}
              content={<ChainsStatsTooltipRow entries={totalLongPositionSizesEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Short Positions</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}`}
              content={<ChainsStatsTooltipRow entries={totalShortPositionSizesEntries} />}
            />
          </div>
        </div>
        {feesSummary?.lastUpdatedAt ? (
          <div className="App-card-row">
            <div className="label">
              <Trans>Fees for the past</Trans> {formatDistanceToNowStrict(feesSummary.lastUpdatedAt * 1000)}
            </div>
            <div>
              <TooltipComponent
                position="bottom-end"
                className="whitespace-nowrap"
                handle={`$${formatAmount(totalWeeklyFeesUsd, USD_DECIMALS, 2, true)}`}
                content={<ChainsStatsTooltipRow entries={weeklyFeesEntries} />}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
