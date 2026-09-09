import { t, Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, MEGAETH } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useGmxPrice, useTotalGmxStaked } from "domain/legacy";
import { useProtocolStatsFeesInfo } from "domain/protocolStats/useProtocolStatsFeesInfo";
import { isProtocolStatsNetworkStale, useProtocolStatsSummary } from "domain/protocolStats/useProtocolStatsSummary";
import { parseProtocolStatsUsd } from "domain/protocolStats/utils";
import { useV1FeesInfo, useVolumeInfo } from "domain/stats";
import { usePositionsTotalMargin } from "domain/synthetics/positions/usePositionsTotalMargin";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useChainId } from "lib/chains";
import { arrayURLFetcher } from "lib/fetcher";
import { GLP_DECIMALS, GMX_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmountHuman } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import { AppCard, AppCardSection, AppCardSplit } from "components/AppCard/AppCard";
import ChainsStatsTooltipRow, { sumNetworkParts } from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

import { ACTIVE_CHAIN_IDS } from "./DashboardV2";
import { getFormattedFeesDuration } from "./getFormattedFeesDuration";
import { getPositionStats } from "./getPositionStats";
import type { ChainStats } from "./useDashboardChainStatsMulticall";

type NetworkRow = { label: string; value: bigint | undefined };

// highest first, with a network whose value has not arrived yet kept last rather than ordered as zero
function sortNetworkRows(rows: NetworkRow[]): NetworkRow[] {
  return [...rows].sort((a, b) => {
    if (a.value === undefined || b.value === undefined) {
      return a.value === b.value ? 0 : a.value === undefined ? 1 : -1;
    }

    return a.value === b.value ? 0 : a.value > b.value ? -1 : 1;
  });
}

// a headline total stays unknown until every contribution is known, so a missing network never reads as zero
function sumKnown(...parts: (bigint | undefined)[]): bigint | undefined {
  return parts.some((part) => part === undefined) ? undefined : parts.reduce<bigint>((acc, part) => acc + part!, 0n);
}

const SOLANA_ENTRY = "Solana";

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
  const v2MegaethOverview = useV2Stats(MEGAETH);
  const gmtradeSummary = useProtocolStatsSummary({ networks: ["solana"] });
  const gmtradeOverview = gmtradeSummary.data?.byNetwork.solana;
  const staleTitles = useMemo(
    () => (isProtocolStatsNetworkStale(gmtradeSummary.data, "solana") ? [SOLANA_ENTRY] : []),
    [gmtradeSummary.data]
  );
  const gmtradeFees = useProtocolStatsFeesInfo({ networks: ["solana"] });

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

  const arbitrumPositionsMarginUsd = usePositionsTotalMargin(ARBITRUM);
  const avalanchePositionsMarginUsd = usePositionsTotalMargin(AVALANCHE);
  const megaethPositionsMarginUsd = usePositionsTotalMargin(MEGAETH);

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

  const gmTvlArbitrum = v2ArbitrumOverview.totalGMLiquidity;
  const gmTvlAvalanche = v2AvalancheOverview.totalGMLiquidity;
  const gmTvlMegaeth = v2MegaethOverview.totalGMLiquidity;
  const gmTvlGmtrade = parseProtocolStatsUsd(gmtradeOverview?.tvl?.pools);

  const totalGmTvl = sumKnown(gmTvlArbitrum, gmTvlAvalanche, gmTvlMegaeth, gmTvlGmtrade);

  let displayTvlArbitrum: bigint | undefined = undefined;
  let displayTvlAvalanche: bigint | undefined = undefined;
  let displayTvlMegaeth: bigint | undefined = undefined;
  let displayTvl: bigint | undefined = undefined;
  if (
    gmxPrice !== undefined &&
    stakedGmxArbitrum !== undefined &&
    stakedGmxAvalanche !== undefined &&
    glpMarketCapArbitrum !== undefined &&
    glpMarketCapAvalanche !== undefined &&
    arbitrumPositionsMarginUsd !== undefined &&
    avalanchePositionsMarginUsd !== undefined &&
    megaethPositionsMarginUsd !== undefined &&
    gmTvlArbitrum !== undefined &&
    gmTvlAvalanche !== undefined &&
    gmTvlMegaeth !== undefined
  ) {
    const stakedGmxUsdArbitrum = bigMath.mulDiv(gmxPrice, stakedGmxArbitrum, expandDecimals(1, GMX_DECIMALS));
    const stakedGmxUsdAvalanche = bigMath.mulDiv(gmxPrice, stakedGmxAvalanche, expandDecimals(1, GMX_DECIMALS));

    // GMX Staked + GLP Pools + GM Pools
    displayTvlArbitrum = stakedGmxUsdArbitrum + glpMarketCapArbitrum + gmTvlArbitrum + arbitrumPositionsMarginUsd;
    displayTvlAvalanche = stakedGmxUsdAvalanche + glpMarketCapAvalanche + gmTvlAvalanche + avalanchePositionsMarginUsd;
    displayTvlMegaeth = gmTvlMegaeth + megaethPositionsMarginUsd;
    displayTvl = sumKnown(displayTvlArbitrum, displayTvlAvalanche, displayTvlMegaeth, gmTvlGmtrade);
  }

  // #endregion TVL and GLP Pool

  // #region Daily Volume
  const v1DailyVolumeInfo = useVolumeInfo();
  const v1ArbitrumDailyVolume = v1DailyVolumeInfo?.[ARBITRUM];
  const v1AvalancheDailyVolume = v1DailyVolumeInfo?.[AVALANCHE];

  const v2ArbitrumDailyVolume = v2ArbitrumOverview.dailyVolume;
  const v2AvalancheDailyVolume = v2AvalancheOverview.dailyVolume;
  const v2MegaethDailyVolume = v2MegaethOverview.dailyVolume;
  const gmtradeDailyVolume = parseProtocolStatsUsd(gmtradeOverview?.volume24h?.total);

  const totalDailyVolume = sumBigInts(
    v1ArbitrumDailyVolume,
    v1AvalancheDailyVolume,
    v2ArbitrumDailyVolume,
    v2AvalancheDailyVolume,
    v2MegaethDailyVolume,
    gmtradeDailyVolume
  );
  // #endregion Daily Volume

  // #region Open Interest
  const v1ArbitrumOpenInterest = positionStatsInfo?.[ARBITRUM]?.openInterest;
  const v1AvalancheOpenInterest = positionStatsInfo?.[AVALANCHE]?.openInterest;
  const v2ArbitrumOpenInterest = v2ArbitrumOverview.openInterest;
  const v2AvalancheOpenInterest = v2AvalancheOverview.openInterest;
  const v2MegaethOpenInterest = v2MegaethOverview.openInterest;
  const gmtradeOpenInterest = parseProtocolStatsUsd(gmtradeOverview?.openInterest?.total);

  const totalOpenInterest = sumBigInts(
    v1ArbitrumOpenInterest,
    v1AvalancheOpenInterest,
    v2ArbitrumOpenInterest,
    v2AvalancheOpenInterest,
    v2MegaethOpenInterest,
    gmtradeOpenInterest
  );
  // #endregion Open Interest

  // #region Long Position Sizes
  const v1ArbitrumLongPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalLongPositionSizes;
  const v1AvalancheLongPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalLongPositionSizes;

  const v2ArbitrumLongPositionSizes = v2ArbitrumOverview.totalLongPositionSizes;
  const v2AvalancheLongPositionSizes = v2AvalancheOverview.totalLongPositionSizes;
  const v2MegaethLongPositionSizes = v2MegaethOverview.totalLongPositionSizes;
  const gmtradeLongPositionSizes = parseProtocolStatsUsd(gmtradeOverview?.openInterest?.long);

  const totalLongPositionSizes = sumBigInts(
    v1ArbitrumLongPositionSizes,
    v1AvalancheLongPositionSizes,
    v2ArbitrumLongPositionSizes,
    v2AvalancheLongPositionSizes,
    v2MegaethLongPositionSizes,
    gmtradeLongPositionSizes
  );
  // #endregion Long Position Sizes

  // #region Short Position Sizes
  const v1ArbitrumShortPositionSizes = positionStatsInfo?.[ARBITRUM]?.totalShortPositionSizes;
  const v1AvalancheShortPositionSizes = positionStatsInfo?.[AVALANCHE]?.totalShortPositionSizes;

  const v2ArbitrumShortPositionSizes = v2ArbitrumOverview.totalShortPositionSizes;
  const v2AvalancheShortPositionSizes = v2AvalancheOverview.totalShortPositionSizes;
  const v2MegaethShortPositionSizes = v2MegaethOverview.totalShortPositionSizes;
  const gmtradeShortPositionSizes = parseProtocolStatsUsd(gmtradeOverview?.openInterest?.short);

  const totalShortPositionSizes = sumBigInts(
    v1ArbitrumShortPositionSizes,
    v1AvalancheShortPositionSizes,
    v2ArbitrumShortPositionSizes,
    v2AvalancheShortPositionSizes,
    v2MegaethShortPositionSizes,
    gmtradeShortPositionSizes
  );
  // #endregion Short Position Sizes

  // #region Fees
  const v1ArbitrumEpochFees = v1ArbitrumFees?.epochFees;
  const v1AvalancheEpochFees = v1AvalancheFees?.epochFees;

  const v2ArbitrumEpochFees = v2ArbitrumOverview?.epochFees;
  const v2AvalancheEpochFees = v2AvalancheOverview?.epochFees;
  const v2MegaethEpochFees = v2MegaethOverview?.epochFees;
  const gmtradeEpochFees = gmtradeFees?.epochFees;

  const totalEpochFeesUsd = sumBigInts(
    v1ArbitrumEpochFees,
    v1AvalancheEpochFees,
    v2ArbitrumEpochFees,
    v2AvalancheEpochFees,
    v2MegaethEpochFees,
    gmtradeEpochFees
  );

  const v1ArbitrumWeeklyFees = v1ArbitrumFees?.weeklyFees;
  const v1AvalancheWeeklyFees = v1AvalancheFees?.weeklyFees;

  const v2ArbitrumWeeklyFees = v2ArbitrumOverview?.weeklyFees;
  const v2AvalancheWeeklyFees = v2AvalancheOverview?.weeklyFees;
  const v2MegaethWeeklyFees = v2MegaethOverview?.weeklyFees;
  const gmtradeWeeklyFees = gmtradeFees?.weeklyFees;

  const totalWeeklyFeesUsd = sumBigInts(
    v1ArbitrumWeeklyFees,
    v1AvalancheWeeklyFees,
    v2ArbitrumWeeklyFees,
    v2AvalancheWeeklyFees,
    v2MegaethWeeklyFees,
    gmtradeWeeklyFees
  );

  // #endregion Fees

  const dailyVolumeEntries = useMemo(
    () => ({
      Arbitrum: sumNetworkParts(v2ArbitrumOverview?.dailyVolume, v1ArbitrumDailyVolume),
      Avalanche: sumNetworkParts(v2AvalancheOverview?.dailyVolume, v1AvalancheDailyVolume),
      MegaETH: v2MegaethOverview?.dailyVolume,
      [SOLANA_ENTRY]: gmtradeDailyVolume,
    }),
    [
      gmtradeDailyVolume,
      v1ArbitrumDailyVolume,
      v1AvalancheDailyVolume,
      v2ArbitrumOverview?.dailyVolume,
      v2AvalancheOverview?.dailyVolume,
      v2MegaethOverview?.dailyVolume,
    ]
  );

  const openInterestEntries = useMemo(
    () => ({
      Arbitrum: sumNetworkParts(v2ArbitrumOpenInterest, v1ArbitrumOpenInterest),
      Avalanche: sumNetworkParts(v2AvalancheOpenInterest, v1AvalancheOpenInterest),
      MegaETH: v2MegaethOpenInterest,
      [SOLANA_ENTRY]: gmtradeOpenInterest,
    }),
    [
      v1ArbitrumOpenInterest,
      v1AvalancheOpenInterest,
      v2ArbitrumOpenInterest,
      v2AvalancheOpenInterest,
      v2MegaethOpenInterest,
      gmtradeOpenInterest,
    ]
  );

  const totalLongPositionSizesEntries = useMemo(
    () => ({
      Arbitrum: sumNetworkParts(v2ArbitrumLongPositionSizes, v1ArbitrumLongPositionSizes),
      Avalanche: sumNetworkParts(v2AvalancheLongPositionSizes, v1AvalancheLongPositionSizes),
      MegaETH: v2MegaethLongPositionSizes,
      [SOLANA_ENTRY]: gmtradeLongPositionSizes,
    }),
    [
      v1ArbitrumLongPositionSizes,
      v1AvalancheLongPositionSizes,
      v2ArbitrumLongPositionSizes,
      v2AvalancheLongPositionSizes,
      v2MegaethLongPositionSizes,
      gmtradeLongPositionSizes,
    ]
  );

  const totalShortPositionSizesEntries = useMemo(
    () => ({
      Arbitrum: sumNetworkParts(v2ArbitrumShortPositionSizes, v1ArbitrumShortPositionSizes),
      Avalanche: sumNetworkParts(v2AvalancheShortPositionSizes, v1AvalancheShortPositionSizes),
      MegaETH: v2MegaethShortPositionSizes,
      [SOLANA_ENTRY]: gmtradeShortPositionSizes,
    }),
    [
      v1ArbitrumShortPositionSizes,
      v1AvalancheShortPositionSizes,
      v2ArbitrumShortPositionSizes,
      v2AvalancheShortPositionSizes,
      v2MegaethShortPositionSizes,
      gmtradeShortPositionSizes,
    ]
  );

  const epochFeesEntries = useMemo(
    () => ({
      Arbitrum: sumNetworkParts(v2ArbitrumEpochFees, v1ArbitrumEpochFees),
      Avalanche: sumNetworkParts(v2AvalancheEpochFees, v1AvalancheEpochFees),
      MegaETH: v2MegaethEpochFees,
      [SOLANA_ENTRY]: gmtradeEpochFees,
    }),
    [
      v1ArbitrumEpochFees,
      v1AvalancheEpochFees,
      v2ArbitrumEpochFees,
      v2AvalancheEpochFees,
      v2MegaethEpochFees,
      gmtradeEpochFees,
    ]
  );

  const tvlRows = useMemo(
    () =>
      sortNetworkRows([
        { label: t`Arbitrum`, value: displayTvlArbitrum },
        { label: t`Avalanche`, value: displayTvlAvalanche },
        { label: "MegaETH", value: displayTvlMegaeth },
        { label: "Solana", value: gmTvlGmtrade },
      ]),
    [displayTvlArbitrum, displayTvlAvalanche, displayTvlMegaeth, gmTvlGmtrade]
  );

  const gmPoolRows = useMemo(
    () =>
      sortNetworkRows([
        { label: t`Arbitrum`, value: gmTvlArbitrum },
        { label: t`Avalanche`, value: gmTvlAvalanche },
        { label: "MegaETH", value: gmTvlMegaeth },
        { label: "Solana", value: gmTvlGmtrade },
      ]),
    [gmTvlArbitrum, gmTvlAvalanche, gmTvlMegaeth, gmTvlGmtrade]
  );

  const [formattedDuration, setFormattedDuration] = useState(() => getFormattedFeesDuration());

  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedDuration(getFormattedFeesDuration());
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  const feesSubtotal = useMemo(() => {
    // only GMX-buyback fee allocations feed this: GMTrade fees buy GT historically and nothing since 2026-01-16
    const v1GmxBuyPressure = (((v1ArbitrumWeeklyFees ?? 0n) + (v1AvalancheWeeklyFees ?? 0n)) * 30n) / 100n;
    const v2GmxBuyPressure =
      (((v2ArbitrumWeeklyFees ?? 0n) + (v2AvalancheWeeklyFees ?? 0n) + (v2MegaethWeeklyFees ?? 0n)) * 27n) / 100n;
    const annualizedTotal = (totalWeeklyFeesUsd * 365n) / 7n;
    const annualizedGmxBuyPressure = ((v1GmxBuyPressure + v2GmxBuyPressure) * 365n) / 7n;

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
            <Trans>Annualized GMX buy pressure:</Trans>
          </span>
          <span className="numbers">{formatAmountHuman(annualizedGmxBuyPressure, USD_DECIMALS, true, 2)}</span>
        </p>
        <p className="Tooltip-row !mt-16 max-w-[260px] whitespace-normal">
          <Trans>Annualized data based on the past 7 days. GMTrade fees do not contribute to GMX buybacks.</Trans>
        </p>
      </>
    );
  }, [
    v1ArbitrumWeeklyFees,
    v1AvalancheWeeklyFees,
    v2ArbitrumWeeklyFees,
    v2AvalancheWeeklyFees,
    v2MegaethWeeklyFees,
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
                  content={
                    <ChainsStatsTooltipRow
                      entries={epochFeesEntries}
                      subtotal={feesSubtotal}
                      staleTitles={staleTitles}
                    />
                  }
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
                      <Trans>TVL includes GMX staked, GM pools, and position collateral</Trans>
                      <br />
                      <br />
                      {tvlRows.map(({ label, value }) => (
                        <StatsTooltipRow
                          key={label}
                          label={label}
                          showDollar={false}
                          value={formatAmountHuman(value, USD_DECIMALS, true, 2)}
                        />
                      ))}
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
                      {gmPoolRows.map(({ label, value }) => (
                        <StatsTooltipRow
                          key={label}
                          label={label}
                          showDollar={false}
                          value={formatAmountHuman(value, USD_DECIMALS, true, 2)}
                        />
                      ))}
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
                  content={<ChainsStatsTooltipRow entries={dailyVolumeEntries} staleTitles={staleTitles} />}
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
                  content={<ChainsStatsTooltipRow entries={openInterestEntries} staleTitles={staleTitles} />}
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
                  content={<ChainsStatsTooltipRow entries={totalLongPositionSizesEntries} staleTitles={staleTitles} />}
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
                  content={<ChainsStatsTooltipRow entries={totalShortPositionSizesEntries} staleTitles={staleTitles} />}
                />
              </div>
            </div>
          </AppCardSection>
        }
      ></AppCardSplit>
    </AppCard>
  );
}
