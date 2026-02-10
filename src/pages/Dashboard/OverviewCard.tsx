import { t, Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
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

import { AppCard, AppCardSection, AppCardSplit } from "components/AppCard/AppCard";
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
  const v2BotanixOverview = useV2Stats(BOTANIX);

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
  const botanixPositionsCollateralUsd = usePositionsTotalCollateral(BOTANIX);

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
  const gmTvlBotanix = v2BotanixOverview.totalGMLiquidity;

  const totalGmTvl = gmTvlArbitrum + gmTvlAvalanche + gmTvlBotanix;

  let displayTvlArbitrum: bigint | undefined = undefined;
  let displayTvlAvalanche: bigint | undefined = undefined;
  let displayTvlBotanix: bigint | undefined = undefined;
  let displayTvl: bigint | undefined = undefined;
  if (
    gmxPrice !== undefined &&
    stakedGmxArbitrum !== undefined &&
    stakedGmxAvalanche !== undefined &&
    glpMarketCapArbitrum !== undefined &&
    glpMarketCapAvalanche !== undefined &&
    arbitrumPositionsCollateralUsd !== undefined &&
    avalanchePositionsCollateralUsd !== undefined &&
    botanixPositionsCollateralUsd !== undefined
  ) {
    const stakedGmxUsdArbitrum = bigMath.mulDiv(gmxPrice, stakedGmxArbitrum, expandDecimals(1, GMX_DECIMALS));
    const stakedGmxUsdAvalanche = bigMath.mulDiv(gmxPrice, stakedGmxAvalanche, expandDecimals(1, GMX_DECIMALS));

    // GMX Staked + GLP Pools + GM Pools
    displayTvlArbitrum = stakedGmxUsdArbitrum + glpMarketCapArbitrum + gmTvlArbitrum + arbitrumPositionsCollateralUsd;
    displayTvlAvalanche =
      stakedGmxUsdAvalanche + glpMarketCapAvalanche + gmTvlAvalanche + avalanchePositionsCollateralUsd;
    displayTvlBotanix = gmTvlBotanix + botanixPositionsCollateralUsd;
    displayTvl = displayTvlArbitrum + displayTvlAvalanche;
  }

  // #endregion TVL and GLP Pool

  // #region Daily Volume
  const v1DailyVolumeInfo = useVolumeInfo();
  const v1ArbitrumDailyVolume = v1DailyVolumeInfo?.[ARBITRUM];
  const v1AvalancheDailyVolume = v1DailyVolumeInfo?.[AVALANCHE];

  const v2ArbitrumDailyVolume = v2ArbitrumOverview.dailyVolume;
  const v2AvalancheDailyVolume = v2AvalancheOverview.dailyVolume;
  const v2BotanixDailyVolume = v2BotanixOverview.dailyVolume;

  const totalDailyVolume = sumBigInts(
    v1ArbitrumDailyVolume,
    v1AvalancheDailyVolume,
    v2ArbitrumDailyVolume,
    v2AvalancheDailyVolume,
    v2BotanixDailyVolume
  );
  // #endregion Daily Volume

  // #region Open Interest
  const v1ArbitrumOpenInterest = positionStatsInfo?.[ARBITRUM]?.openInterest;
  const v1AvalancheOpenInterest = positionStatsInfo?.[AVALANCHE]?.openInterest;
  const v2ArbitrumOpenInterest = v2ArbitrumOverview.openInterest;
  const v2AvalancheOpenInterest = v2AvalancheOverview.openInterest;
  const v2BotanixOpenInterest = v2BotanixOverview.openInterest;

  const totalOpenInterest = sumBigInts(
    v1ArbitrumOpenInterest,
    v1AvalancheOpenInterest,
    v2ArbitrumOpenInterest,
    v2AvalancheOpenInterest,
    v2BotanixOpenInterest
  );
  // #endregion Open Interest

  // #region Long Position Sizes
  const v1ArbitrumLongPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalLongPositionSizes;
  const v1AvalancheLongPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalLongPositionSizes;

  const v2ArbitrumLongPositionSizes = v2ArbitrumOverview.totalLongPositionSizes;
  const v2AvalancheLongPositionSizes = v2AvalancheOverview.totalLongPositionSizes;
  const v2BotanixLongPositionSizes = v2BotanixOverview.totalLongPositionSizes;

  const totalLongPositionSizes = sumBigInts(
    v1ArbitrumLongPositionSizes,
    v1AvalancheLongPositionSizes,
    v2ArbitrumLongPositionSizes,
    v2AvalancheLongPositionSizes,
    v2BotanixLongPositionSizes
  );
  // #endregion Long Position Sizes

  // #region Short Position Sizes
  const v1ArbitrumShortPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalShortPositionSizes;
  const v1AvalancheShortPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalShortPositionSizes;

  const v2ArbitrumShortPositionSizes = v2ArbitrumOverview.totalShortPositionSizes;
  const v2AvalancheShortPositionSizes = v2AvalancheOverview.totalShortPositionSizes;
  const v2BotanixShortPositionSizes = v2BotanixOverview.totalShortPositionSizes;

  const totalShortPositionSizes = sumBigInts(
    v1ArbitrumShortPositionSizes,
    v1AvalancheShortPositionSizes,
    v2ArbitrumShortPositionSizes,
    v2AvalancheShortPositionSizes,
    v2BotanixShortPositionSizes
  );
  // #endregion Short Position Sizes

  // #region Fees
  const v1ArbitrumEpochFees = v1ArbitrumFees?.epochFees;
  const v1AvalancheEpochFees = v1AvalancheFees?.epochFees;

  const v2ArbitrumEpochFees = v2ArbitrumOverview?.epochFees;
  const v2AvalancheEpochFees = v2AvalancheOverview?.epochFees;
  const v2BotanixEpochFees = v2BotanixOverview?.epochFees;

  const totalEpochFeesUsd = sumBigInts(
    v1ArbitrumEpochFees,
    v1AvalancheEpochFees,
    v2ArbitrumEpochFees,
    v2AvalancheEpochFees,
    v2BotanixEpochFees
  );

  const v1ArbitrumWeeklyFees = v1ArbitrumFees?.weeklyFees;
  const v1AvalancheWeeklyFees = v1AvalancheFees?.weeklyFees;

  const v2ArbitrumWeeklyFees = v2ArbitrumOverview?.weeklyFees;
  const v2AvalancheWeeklyFees = v2AvalancheOverview?.weeklyFees;
  const v2BotanixWeeklyFees = v2BotanixOverview?.weeklyFees;

  const totalWeeklyFeesUsd = sumBigInts(
    v1ArbitrumWeeklyFees,
    v1AvalancheWeeklyFees,
    v2ArbitrumWeeklyFees,
    v2AvalancheWeeklyFees,
    v2BotanixWeeklyFees
  );

  // #endregion Fees

  const dailyVolumeEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumOverview?.dailyVolume,
      "V2 Avalanche": v2AvalancheOverview?.dailyVolume,
      "V2 Botanix": v2BotanixOverview?.dailyVolume,
      "V1 Arbitrum": v1ArbitrumDailyVolume,
      "V1 Avalanche": v1AvalancheDailyVolume,
    }),
    [
      v1ArbitrumDailyVolume,
      v1AvalancheDailyVolume,
      v2ArbitrumOverview?.dailyVolume,
      v2AvalancheOverview?.dailyVolume,
      v2BotanixOverview?.dailyVolume,
    ]
  );

  const openInterestEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumOpenInterest,
      "V2 Avalanche": v2AvalancheOpenInterest,
      "V2 Botanix": v2BotanixOpenInterest,
      "V1 Avalanche": v1AvalancheOpenInterest,
      "V1 Arbitrum": v1ArbitrumOpenInterest,
    }),
    [
      v1ArbitrumOpenInterest,
      v1AvalancheOpenInterest,
      v2ArbitrumOpenInterest,
      v2AvalancheOpenInterest,
      v2BotanixOpenInterest,
    ]
  );

  const totalLongPositionSizesEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumLongPositionSizes,
      "V2 Avalanche": v2AvalancheLongPositionSizes,
      "V2 Botanix": v2BotanixLongPositionSizes,
      "V1 Arbitrum": v1ArbitrumLongPositionSizes,
      "V1 Avalanche": v1AvalancheLongPositionSizes,
    }),
    [
      v1ArbitrumLongPositionSizes,
      v1AvalancheLongPositionSizes,
      v2ArbitrumLongPositionSizes,
      v2AvalancheLongPositionSizes,
      v2BotanixLongPositionSizes,
    ]
  );

  const totalShortPositionSizesEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumShortPositionSizes,
      "V2 Avalanche": v2AvalancheShortPositionSizes,
      "V2 Botanix": v2BotanixShortPositionSizes,
      "V1 Arbitrum": v1ArbitrumShortPositionSizes,
      "V1 Avalanche": v1AvalancheShortPositionSizes,
    }),
    [
      v1ArbitrumShortPositionSizes,
      v1AvalancheShortPositionSizes,
      v2ArbitrumShortPositionSizes,
      v2AvalancheShortPositionSizes,
      v2BotanixShortPositionSizes,
    ]
  );

  const epochFeesEntries = useMemo(
    () => ({
      "V2 Arbitrum": v2ArbitrumEpochFees,
      "V2 Avalanche": v2AvalancheEpochFees,
      "V2 Botanix": v2BotanixEpochFees,
      "V1 Arbitrum": v1ArbitrumEpochFees,
      "V1 Avalanche": v1AvalancheEpochFees,
    }),
    [v1ArbitrumEpochFees, v1AvalancheEpochFees, v2ArbitrumEpochFees, v2AvalancheEpochFees, v2BotanixEpochFees]
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
    const v2BuyingPressure =
      (((v2ArbitrumWeeklyFees ?? 0n) + (v2AvalancheWeeklyFees ?? 0n) + (v2BotanixWeeklyFees ?? 0n)) * 27n) / 100n;
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
          <span className="numbers">{formatAmountHuman(annualizedTotal, USD_DECIMALS, true, 2)}</span>
        </p>
        <p className="Tooltip-row">
          <span className="label">
            <Trans>Annualized buy pressure (BB&D):</Trans>
          </span>
          <span className="numbers">{formatAmountHuman(annualizedTotalBuyingPressure, USD_DECIMALS, true, 2)}</span>
        </p>
        <p className="Tooltip-row !mt-16">
          <Trans>Annualized data based on the past 7 days</Trans>
        </p>
      </>
    );
  }, [
    v1ArbitrumWeeklyFees,
    v1AvalancheWeeklyFees,
    v2ArbitrumWeeklyFees,
    v2AvalancheWeeklyFees,
    v2BotanixWeeklyFees,
    totalWeeklyFeesUsd,
  ]);

  return (
    <AppCard>
      <AppCardSection className="text-body-large font-medium">
        <Trans>Overview</Trans>
      </AppCardSection>
      <AppCardSplit
        className="max-lg:flex-col"
        leftClassName="max-lg:border-r-0 max-lg:border-b"
        right={
          <AppCardSection className="pb-24">
            <div className="App-card-row">
              <div className="label">
                <Trans>Fees for the past</Trans> {formattedDuration}
              </div>
              <div>
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={formatAmountHuman(totalEpochFeesUsd, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  content={<ChainsStatsTooltipRow entries={epochFeesEntries} subtotal={feesSubtotal} />}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>TVL</Trans>
              </div>
              <div>
                <TooltipComponent
                  handle={formatAmountHuman(displayTvl, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  position="bottom-end"
                  content={
                    <>
                      <Trans>TVL includes GMX staked, GLP pool, GM pools, and position collateral</Trans>
                      <br />
                      <br />
                      <StatsTooltipRow
                        label={t`Arbitrum`}
                        showDollar={false}
                        value={formatAmountHuman(displayTvlArbitrum, USD_DECIMALS, true, 2)}
                      />
                      <StatsTooltipRow
                        label={t`Avalanche`}
                        showDollar={false}
                        value={formatAmountHuman(displayTvlAvalanche, USD_DECIMALS, true, 2)}
                      />
                      <StatsTooltipRow
                        label={t`Botanix`}
                        showDollar={false}
                        value={formatAmountHuman(displayTvlBotanix, USD_DECIMALS, true, 2)}
                      />
                      <div className="!my-8 h-1 bg-gray-800" />
                      <StatsTooltipRow
                        label={t`Total`}
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
                <Trans>GLP pool</Trans>
              </div>
              <div>
                <TooltipComponent
                  handle={formatAmountHuman(totalGlpTvl, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  position="bottom-end"
                  content={
                    <>
                      <Trans>Total value of tokens in the GLP pool</Trans>
                      <br />
                      <br />
                      <StatsTooltipRow
                        label={t`Arbitrum`}
                        showDollar={false}
                        value={formatAmountHuman(glpTvlArbitrum, USD_DECIMALS, true, 2)}
                      />
                      <StatsTooltipRow
                        label={t`Avalanche`}
                        showDollar={false}
                        value={formatAmountHuman(glpTvlAvalanche, USD_DECIMALS, true, 2)}
                      />
                      <div className="my-8 h-1 bg-gray-800" />
                      <StatsTooltipRow
                        label={t`Total`}
                        showDollar={false}
                        value={formatAmountHuman(totalGlpTvl, USD_DECIMALS, true, 2)}
                      />
                      <br />
                      <Trans>May be higher on other sites that include position collateral.</Trans>
                    </>
                  }
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>GM pools</Trans>
              </div>
              <div>
                <TooltipComponent
                  handle={formatAmountHuman(totalGmTvl, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  position="bottom-end"
                  content={
                    <>
                      <Trans>Total value of tokens in GM pools</Trans>
                      <br />
                      <br />
                      <StatsTooltipRow
                        label={t`Arbitrum`}
                        showDollar={false}
                        value={formatAmountHuman(gmTvlArbitrum, USD_DECIMALS, true, 2)}
                      />
                      <StatsTooltipRow
                        label={t`Avalanche`}
                        showDollar={false}
                        value={formatAmountHuman(gmTvlAvalanche, USD_DECIMALS, true, 2)}
                      />
                      <StatsTooltipRow
                        label={t`Botanix`}
                        showDollar={false}
                        value={formatAmountHuman(gmTvlBotanix, USD_DECIMALS, true, 2)}
                      />
                      <div className="!my-8 h-1 bg-gray-800" />
                      <StatsTooltipRow
                        label={t`Total`}
                        showDollar={false}
                        value={formatAmountHuman(totalGmTvl, USD_DECIMALS, true, 2)}
                      />
                    </>
                  }
                />
              </div>
            </div>
          </AppCardSection>
        }
        left={
          <AppCardSection className="pb-24">
            <div className="App-card-row">
              <div className="label">
                <Trans>24h volume</Trans>
              </div>
              <div>
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={formatAmountHuman(totalDailyVolume, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  content={<ChainsStatsTooltipRow entries={dailyVolumeEntries} />}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Open interest</Trans>
              </div>
              <div>
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={formatAmountHuman(totalOpenInterest, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  content={<ChainsStatsTooltipRow entries={openInterestEntries} />}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Long positions</Trans>
              </div>
              <div>
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={formatAmountHuman(totalLongPositionSizes, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  content={<ChainsStatsTooltipRow entries={totalLongPositionSizesEntries} />}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Short positions</Trans>
              </div>
              <div>
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={formatAmountHuman(totalShortPositionSizes, USD_DECIMALS, true, 2)}
                  handleClassName="numbers"
                  content={<ChainsStatsTooltipRow entries={totalShortPositionSizesEntries} />}
                />
              </div>
            </div>
          </AppCardSection>
        }
      ></AppCardSplit>
    </AppCard>
  );
}
