import { Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useGmxPrice, useTotalGmxStaked } from "domain/legacy";
import { useV1FeesInfo, useVolumeInfo } from "domain/stats";
import { usePositionsTotalCollateral } from "domain/synthetics/positions/usePositionsTotalCollateral";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useChainId } from "lib/chains";
import { arrayURLFetcher } from "lib/fetcher";
import { GLP_DECIMALS, GMX_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmountHuman } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";


import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

import { ACTIVE_CHAIN_IDS } from "./DashboardV2";
import { getFormattedFeesDuration } from "./getFormattedFeesDuration";
import { getPositionStats } from "./getPositionStats";
import type { ChainStats } from "./useDashboardChainStatsMulticall";

export function OverviewCard({
  statsArbitrum,
  statsAvalanche,
}: {
  statsArbitrum?: ChainStats;
  statsAvalanche?: ChainStats;
}) {
  const { active, signer } = useWallet();
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

  const v1ArbitrumFees = useV1FeesInfo(ARBITRUM);
  const v1AvalancheFees = useV1FeesInfo(AVALANCHE);

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  let { [AVALANCHE]: stakedGmxAvalanche, [ARBITRUM]: stakedGmxArbitrum } = useTotalGmxStaked();

  const arbitrumPositionsCollateralUsd = usePositionsTotalCollateral(ARBITRUM);
  const avalanchePositionsCollateralUsd = usePositionsTotalCollateral(AVALANCHE);

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
    glpMarketCapAvalanche !== undefined &&
    arbitrumPositionsCollateralUsd !== undefined &&
    avalanchePositionsCollateralUsd !== undefined
  ) {
    const stakedGmxUsdArbitrum = bigMath.mulDiv(gmxPrice, stakedGmxArbitrum, expandDecimals(1, GMX_DECIMALS));
    const stakedGmxUsdAvalanche = bigMath.mulDiv(gmxPrice, stakedGmxAvalanche, expandDecimals(1, GMX_DECIMALS));

    // GMX Staked + GLP Pools + GM Pools
    displayTvlArbitrum = stakedGmxUsdArbitrum + glpMarketCapArbitrum + gmTvlArbitrum + arbitrumPositionsCollateralUsd;
    displayTvlAvalanche =
      stakedGmxUsdAvalanche + glpMarketCapAvalanche + gmTvlAvalanche + avalanchePositionsCollateralUsd;
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
  const v1ArbitrumEpochFees = v1ArbitrumFees?.epochFees;
  const v1AvalancheEpochFees = v1AvalancheFees?.epochFees;

  const v2ArbitrumEpochFees = v2ArbitrumOverview?.epochFees;
  const v2AvalancheEpochFees = v2AvalancheOverview?.epochFees;

  const totalEpochFeesUsd = sumBigInts(
    v1ArbitrumEpochFees,
    v1AvalancheEpochFees,
    v2ArbitrumEpochFees,
    v2AvalancheEpochFees
  );

  const v1ArbitrumWeeklyFees = v1ArbitrumFees?.weeklyFees;
  const v1AvalancheWeeklyFees = v1AvalancheFees?.weeklyFees;

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

  const epochFeesEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumEpochFees,
      "V2 Arbitrum": v2ArbitrumEpochFees,
      "V1 Avalanche": v1AvalancheEpochFees,
      "V2 Avalanche": v2AvalancheEpochFees,
    }),
    [v1ArbitrumEpochFees, v1AvalancheEpochFees, v2ArbitrumEpochFees, v2AvalancheEpochFees]
  );

  const [formattedDuration, setFormattedDuration] = useState(() => getFormattedFeesDuration());

  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedDuration(getFormattedFeesDuration());
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  const feesSubtotal = useMemo(() => {
    const v1BuyingPressure = (((v1ArbitrumWeeklyFees ?? 0n) + (v1AvalancheWeeklyFees ?? 0n)) * 30n) / 100n;
    const v2BuyingPressure = (((v2ArbitrumWeeklyFees ?? 0n) + (v2AvalancheWeeklyFees ?? 0n)) * 27n) / 100n;
    const annualizedTotal = (totalWeeklyFeesUsd * 365n) / 7n;
    const totalBuyingPressure = v1BuyingPressure + v2BuyingPressure;
    const annualizedTotalBuyingPressure = (totalBuyingPressure * 365n) / 7n;

    return (
      <>
        <div className="my-5 h-1 bg-gray-800" />
        <p className="Tooltip-row">
          <span className="label">
            <Trans>Annualized:</Trans>
          </span>
          <span className="amount">{formatAmountHuman(annualizedTotal, USD_DECIMALS, true, 2)}</span>
        </p>
        <p className="Tooltip-row">
          <span className="label">
            <Trans>Annualized Buy Pressure (BB&D):</Trans>
          </span>
          <span className="amount">{formatAmountHuman(annualizedTotalBuyingPressure, USD_DECIMALS, true, 2)}</span>
        </p>
        <p className="Tooltip-row !mt-16">
          <Trans>Annualized data based on the past 7 days.</Trans>
        </p>
      </>
    );
  }, [v1ArbitrumWeeklyFees, v1AvalancheWeeklyFees, v2ArbitrumWeeklyFees, v2AvalancheWeeklyFees, totalWeeklyFeesUsd]);

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
              handle={formatAmountHuman(displayTvl, USD_DECIMALS, true, 2)}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value locked takes into account:</Trans>
                  <br />
                  <ul className="my-8 list-disc">
                    <li className="p-2">GMX Staked</li>
                    <li className="p-2">GLP Pool</li>
                    <li className="p-2">GM Pools</li>
                    <li className="p-2">Positions' Collateral</li>
                  </ul>
                  <StatsTooltipRow
                    label="Arbitrum"
                    showDollar={false}
                    value={formatAmountHuman(displayTvlArbitrum, USD_DECIMALS, true, 2)}
                  />
                  <StatsTooltipRow
                    label="Avalanche"
                    showDollar={false}
                    value={formatAmountHuman(displayTvlAvalanche, USD_DECIMALS, true, 2)}
                  />
                  <div className="!my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow
                    label="Total"
                    showDollar={false}
                    value={formatAmountHuman(displayTvl, USD_DECIMALS, true, 2)}
                  />
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
              handle={formatAmountHuman(totalGlpTvl, USD_DECIMALS, true, 2)}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value of tokens in the GLP pools.</Trans>
                  <br />
                  <br />
                  <StatsTooltipRow
                    label="Arbitrum"
                    showDollar={false}
                    value={formatAmountHuman(glpTvlArbitrum, USD_DECIMALS, true, 2)}
                  />
                  <StatsTooltipRow
                    label="Avalanche"
                    showDollar={false}
                    value={formatAmountHuman(glpTvlAvalanche, USD_DECIMALS, true, 2)}
                  />
                  <div className="my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow
                    label="Total"
                    showDollar={false}
                    value={formatAmountHuman(totalGlpTvl, USD_DECIMALS, true, 2)}
                  />
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
              handle={formatAmountHuman(totalGmTvl, USD_DECIMALS, true, 2)}
              position="bottom-end"
              content={
                <>
                  <Trans>Total value of tokens in GM Pools.</Trans>
                  <br />
                  <br />
                  <StatsTooltipRow
                    label="Arbitrum"
                    showDollar={false}
                    value={formatAmountHuman(gmTvlArbitrum, USD_DECIMALS, true, 2)}
                  />
                  <StatsTooltipRow
                    label="Avalanche"
                    showDollar={false}
                    value={formatAmountHuman(gmTvlAvalanche, USD_DECIMALS, true, 2)}
                  />
                  <div className="!my-8 h-1 bg-gray-800" />
                  <StatsTooltipRow
                    label="Total"
                    showDollar={false}
                    value={formatAmountHuman(totalGmTvl, USD_DECIMALS, true, 2)}
                  />
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
              handle={formatAmountHuman(totalDailyVolume, USD_DECIMALS, true, 2)}
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
              handle={formatAmountHuman(totalOpenInterest, USD_DECIMALS, true, 2)}
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
              handle={formatAmountHuman(totalLongPositionSizes, USD_DECIMALS, true, 2)}
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
              handle={formatAmountHuman(totalShortPositionSizes, USD_DECIMALS, true, 2)}
              content={<ChainsStatsTooltipRow entries={totalShortPositionSizesEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Fees for the past</Trans> {formattedDuration}
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={formatAmountHuman(totalEpochFeesUsd, USD_DECIMALS, true, 2)}
              content={<ChainsStatsTooltipRow entries={epochFeesEntries} subtotal={feesSubtotal} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
