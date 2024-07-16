import { Trans, t } from "@lingui/macro";
import TooltipComponent from "components/Tooltip/Tooltip";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";

import { ethers } from "ethers";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { DEFAULT_MAX_USDG_AMOUNT, GLP_DECIMALS, GMX_DECIMALS, USD_DECIMALS, getPageTitle } from "lib/legacy";

import { getContract } from "config/contracts";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import VaultV2 from "abis/VaultV2.json";
import Footer from "components/Footer/Footer";

import "./DashboardV2.css";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import PageTitle from "components/PageTitle/PageTitle";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getIsSyntheticsSupported } from "config/features";
import { getIcons } from "config/icons";
import { TOKEN_COLOR_MAP, getTokenBySymbol, getWhitelistedV1Tokens } from "config/tokens";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useFeesSummary, useTotalVolume, useVolumeInfo } from "domain/stats";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import {
  getMarketIndexName,
  getMarketPoolName,
  useMarketTokensData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { convertToUsd } from "domain/synthetics/tokens";
import { useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { formatDate } from "lib/dates";
import { arrayURLFetcher } from "lib/fetcher";
import {
  BN_ZERO,
  expandDecimals,
  formatAmount,
  formatKeyAmount,
  formatTokenAmount,
  formatUsd,
  numberWithCommas,
} from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { useTradePageVersion } from "lib/useTradePageVersion";
import useWallet from "lib/wallets/useWallet";
import { groupBy } from "lodash";
import AssetDropdown from "./AssetDropdown";
import { bigMath } from "lib/bigmath";

const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

const { ZeroAddress } = ethers;

function getPositionStats(positionStats) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }
  return positionStats.reduce(
    (acc, cv, i) => {
      cv.openInterest = BigInt(cv.totalLongPositionSizes) + BigInt(cv.totalShortPositionSizes);
      acc.totalLongPositionSizes += BigInt(cv.totalLongPositionSizes);
      acc.totalShortPositionSizes += BigInt(cv.totalShortPositionSizes);
      acc.totalOpenInterest += cv.openInterest;

      acc[ACTIVE_CHAIN_IDS[i]] = cv;
      return acc;
    },
    {
      totalLongPositionSizes: 0n,
      totalShortPositionSizes: 0n,
      totalOpenInterest: 0n,
    }
  );
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return BN_ZERO;
  }

  let currentFeesUsd = BN_ZERO;
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = bigMath.mulDiv(fees[i], tokenInfo.contractMinPrice, expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd + feeUsd;
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();
  const totalVolume = useTotalVolume();

  const arbitrumOverview = useV2Stats(ARBITRUM);
  const avalancheOverview = useV2Stats(AVALANCHE);
  const v2MarketsOverview = useMemo(
    () => ({
      [ARBITRUM]: arbitrumOverview,
      [AVALANCHE]: avalancheOverview,
    }),
    [arbitrumOverview, avalancheOverview]
  );
  const currentV2MarketOverview = v2MarketsOverview[chainId];
  const uniqueUsers = useUniqueUsers();
  const chainName = getChainName(chainId);
  const currentIcons = getIcons(chainId);
  const { data: positionStats } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/position_stats")),
    {
      fetcher: arrayURLFetcher,
    }
  );
  const [tradePageVersion] = useTradePageVersion();

  const isV1 = tradePageVersion === 1;
  const isV2 = tradePageVersion === 2;

  let { total: totalGmxSupply } = useTotalGmxSupply();

  const currentVolumeInfo = useVolumeInfo();

  const positionStatsInfo = getPositionStats(positionStats);

  function getWhitelistedTokenAddresses(chainId) {
    const whitelistedTokens = getWhitelistedV1Tokens(chainId);
    return whitelistedTokens.map((token) => token.address);
  }

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const glpManagerAddress = getContract(chainId, "GlpManager");

  const gmxAddress = getContract(chainId, "GMX");
  const glpAddress = getContract(chainId, "GLP");
  const usdgAddress = getContract(chainId, "USDG");

  const tokensForSupplyQuery = [gmxAddress, glpAddress, usdgAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: contractFetcher(signer, GlpManager),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", ZeroAddress],
    {
      fetcher: contractFetcher(signer, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(signer, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(signer, chainId, active, undefined, undefined);
  const { infoTokens: infoTokensArbitrum } = useInfoTokens(undefined, ARBITRUM, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(undefined, AVALANCHE, active, undefined, undefined);

  const { data: currentFees } = useSWR(
    infoTokensArbitrum[ZeroAddress].contractMinPrice !== undefined &&
      infoTokensAvax[ZeroAddress].contractMinPrice !== undefined
      ? "Dashboard:currentFees"
      : null,
    {
      fetcher: () => {
        return Promise.all(
          ACTIVE_CHAIN_IDS.map((chainId) =>
            contractFetcher(undefined, ReaderV2, [getWhitelistedTokenAddresses(chainId)])([
              `Dashboard:fees:${chainId}`,
              chainId,
              getContract(chainId, "Reader"),
              "getFees",
              getContract(chainId, "Vault"),
            ])
          )
        ).then((fees) => {
          return fees.reduce<Record<string, bigint>>(
            (acc, cv, i) => {
              const feeUSD = getCurrentFeesUsd(
                getWhitelistedTokenAddresses(ACTIVE_CHAIN_IDS[i]),
                cv,
                ACTIVE_CHAIN_IDS[i] === ARBITRUM ? infoTokensArbitrum : infoTokensAvax
              );
              acc[ACTIVE_CHAIN_IDS[i]] = feeUSD;
              acc.total = acc.total + feeUSD;
              return acc;
            },
            { total: BN_ZERO }
          );
        });
      },
    }
  );

  const { data: feesSummaryByChain } = useFeesSummary();
  const feesSummary = feesSummaryByChain[chainId];

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];
  const shouldIncludeCurrrentFees =
    feesSummaryByChain[chainId]?.lastUpdatedAt &&
    parseInt(String(Date.now() / 1000)) - feesSummaryByChain[chainId]?.lastUpdatedAt > 60 * 60;

  const totalFees = ACTIVE_CHAIN_IDS.map((chainId) => {
    if (shouldIncludeCurrrentFees && currentFees && currentFees[chainId]) {
      return (
        Number(currentFees[chainId]) / Number(expandDecimals(1, USD_DECIMALS)) +
        Number(feesSummaryByChain[chainId]?.totalFees || 0)
      );
    }

    return Number(feesSummaryByChain[chainId].totalFees) || 0;
  })
    .map((v) => Math.round(v))
    .reduce(
      (acc, cv, i) => {
        acc[ACTIVE_CHAIN_IDS[i]] = cv;
        acc.total = acc.total + cv;
        return acc;
      },
      { total: 0 }
    );

  const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? signer : undefined },
    active
  );

  let { total: totalGmxInLiquidity } = useTotalGmxInLiquidity();

  let { [AVALANCHE]: avaxStakedGmx, [ARBITRUM]: arbitrumStakedGmx, total: totalStakedGmx } = useTotalGmxStaked();

  let gmxMarketCap;
  if (gmxPrice !== undefined && totalGmxSupply !== undefined) {
    gmxMarketCap = bigMath.mulDiv(gmxPrice, totalGmxSupply, expandDecimals(1, GMX_DECIMALS));
  }

  let stakedGmxSupplyUsd;
  if (gmxPrice !== undefined && totalStakedGmx !== undefined) {
    stakedGmxSupplyUsd = bigMath.mulDiv(totalStakedGmx, gmxPrice, expandDecimals(1, GMX_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = (aums[0] + aums[1]) / 2n;
  }

  let glpPrice;
  let glpSupply;
  let glpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    glpSupply = totalSupplies[3];
    glpPrice =
      aum && aum > 0 && glpSupply > 0
        ? bigMath.mulDiv(aum, expandDecimals(1, GLP_DECIMALS), glpSupply)
        : expandDecimals(1, USD_DECIMALS);
    glpMarketCap = bigMath.mulDiv(glpPrice, glpSupply, expandDecimals(1, GLP_DECIMALS));
  }

  let tvl: bigint | undefined = undefined;
  if (
    glpMarketCap !== undefined &&
    gmxPrice !== undefined &&
    totalStakedGmx !== undefined &&
    currentV2MarketOverview?.totalGMLiquidity !== undefined
  ) {
    tvl =
      glpMarketCap +
      bigMath.mulDiv(gmxPrice, totalStakedGmx, expandDecimals(1, GMX_DECIMALS)) +
      currentV2MarketOverview.totalGMLiquidity;
  }

  const ethTreasuryFund = expandDecimals(350 + 148 + 384, 18);
  const glpTreasuryFund = expandDecimals(660001, 18);
  const usdcTreasuryFund = expandDecimals(784598 + 200000, 30);

  let totalTreasuryFundUsd;

  if (eth && eth.contractMinPrice !== undefined && glpPrice !== undefined) {
    const ethTreasuryFundUsd = bigMath.mulDiv(ethTreasuryFund, eth.contractMinPrice, expandDecimals(1, eth.decimals));
    const glpTreasuryFundUsd = bigMath.mulDiv(glpTreasuryFund, glpPrice, expandDecimals(1, 18));

    totalTreasuryFundUsd = ethTreasuryFundUsd + glpTreasuryFundUsd + usdcTreasuryFund;
  }

  let adjustedUsdgSupply = BN_ZERO;

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount !== undefined) {
      adjustedUsdgSupply = adjustedUsdgSupply + tokenInfo.usdgAmount;
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdgAmount ||
      adjustedUsdgSupply === undefined ||
      adjustedUsdgSupply == 0n ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = bigMath.mulDiv(tokenInfo.usdgAmount, BASIS_POINTS_DIVISOR_BIGINT, adjustedUsdgSupply);
    const targetWeightBps =
      ((bigMath.mulDiv(tokenInfo.weight, BASIS_POINTS_DIVISOR_BIGINT, totalTokenWeights) + 1n) / 10n) * 10n;

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="bottom-end"
        maxAllowedWidth={300}
        renderContent={() => {
          return (
            <>
              <StatsTooltipRow
                label={t`Current Weight`}
                value={`${formatAmount(currentWeightBps, 2, 2, false)}%`}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Target Weight`}
                value={`${formatAmount(targetWeightBps, 2, 2, false)}%`}
                showDollar={false}
              />
              <br />
              {currentWeightBps < targetWeightBps && (
                <div className="text-white">
                  <Trans>
                    {tokenInfo.symbol} is below its target weight.
                    <br />
                    <br />
                    Get lower fees to{" "}
                    <Link to="/buy_glp" target="_blank" rel="noopener noreferrer">
                      buy GLP
                    </Link>{" "}
                    with {tokenInfo.symbol}, and to{" "}
                    <Link to="/trade" target="_blank" rel="noopener noreferrer">
                      swap
                    </Link>{" "}
                    {tokenInfo.symbol} for other tokens.
                  </Trans>
                </div>
              )}
              {currentWeightBps > targetWeightBps && (
                <div className="text-white">
                  <Trans>
                    {tokenInfo.symbol} is above its target weight.
                    <br />
                    <br />
                    Get lower fees to{" "}
                    <Link to="/trade" target="_blank" rel="noopener noreferrer">
                      swap
                    </Link>{" "}
                    tokens for {tokenInfo.symbol}.
                  </Trans>
                </div>
              )}
              <br />
              <div>
                <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">
                  <Trans>Read more</Trans>
                </ExternalLink>
                .
              </div>
            </>
          );
        }}
      />
    );
  };

  let stakedPercent = 0;

  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalStakedGmx !== 0n) {
    stakedPercent = Number(bigMath.mulDiv(totalStakedGmx, 100n, totalGmxSupply));
  }

  let liquidityPercent = 0;

  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalGmxInLiquidity !== undefined) {
    liquidityPercent = Number(bigMath.mulDiv(totalGmxInLiquidity, 100n, totalGmxSupply));
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent;

  const gmxDistributionData = useMemo(() => {
    let arr = [
      {
        name: t`staked`,
        value: stakedPercent,
        color: "#4353fa",
      },
      {
        name: t`in liquidity`,
        value: liquidityPercent,
        color: "#0598fa",
      },
      {
        name: t`not staked`,
        value: notStakedPercent,
        color: "#5c0af5",
      },
    ];

    return arr;
  }, [liquidityPercent, notStakedPercent, stakedPercent]);

  const totalStatsStartDate = chainId === AVALANCHE ? t`06 Jan 2022` : t`01 Sep 2021`;

  const { glpPool, stableGlp, totalGlp } = useMemo(() => {
    let stableGlp = 0;
    let totalGlp = 0;
    const glpPool = tokenList
      .map((token) => {
        const tokenInfo = infoTokens[token.address];
        if (tokenInfo.usdgAmount !== undefined && adjustedUsdgSupply !== undefined && adjustedUsdgSupply > 0) {
          const currentWeightBps = bigMath.mulDiv(
            tokenInfo.usdgAmount,
            BASIS_POINTS_DIVISOR_BIGINT,
            adjustedUsdgSupply
          );
          if (tokenInfo.isStable) {
            stableGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          }
          totalGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          return {
            fullname: token.name,
            name: token.symbol,
            color: TOKEN_COLOR_MAP[token.symbol ?? "default"] ?? TOKEN_COLOR_MAP.default,
            value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
          };
        }
        return null;
      })
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
      .filter(<T extends unknown>(x: T): x is NonNullable<T> => Boolean(x));

    return { glpPool, stableGlp, totalGlp };
  }, [adjustedUsdgSupply, infoTokens, tokenList]);

  let stablePercentage = totalGlp > 0 ? ((stableGlp * 100) / totalGlp).toFixed(2) : "0.0";

  const dailyVolumeEntries = useMemo(
    () => ({
      "V1 Arbitrum": currentVolumeInfo?.[ARBITRUM],
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.dailyVolume,
      "V1 Avalanche": currentVolumeInfo?.[AVALANCHE],
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.dailyVolume,
    }),
    [currentVolumeInfo, v2MarketsOverview]
  );

  const openInterestEntries = useMemo(
    () => ({
      "V1 Arbitrum": positionStatsInfo?.[ARBITRUM].openInterest,
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.openInterest,
      "V1 Avalanche": positionStatsInfo?.[AVALANCHE].openInterest,
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.openInterest,
    }),
    [positionStatsInfo, v2MarketsOverview]
  );

  const totalLongPositionSizesEntries = useMemo(
    () => ({
      "V1 Arbitrum": positionStatsInfo?.[ARBITRUM].totalLongPositionSizes,
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.totalLongPositionSizes,
      "V1 Avalanche": positionStatsInfo?.[AVALANCHE].totalLongPositionSizes,
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.totalLongPositionSizes,
    }),
    [positionStatsInfo, v2MarketsOverview]
  );

  const totalShortPositionSizesEntries = useMemo(
    () => ({
      "V1 Arbitrum": positionStatsInfo?.[ARBITRUM].totalShortPositionSizes,
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.totalShortPositionSizes,
      "V1 Avalanche": positionStatsInfo?.[AVALANCHE].totalShortPositionSizes,
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.totalShortPositionSizes,
    }),
    [positionStatsInfo, v2MarketsOverview]
  );

  const weeklyFeesEntries = useMemo(
    () => ({
      "V1 Arbitrum": currentFees?.[ARBITRUM],
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.weeklyFees,
      "V1 Avalanche": currentFees?.[AVALANCHE],
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.weeklyFees,
    }),
    [currentFees, v2MarketsOverview]
  );

  const marketsOverviewEntries = useMemo(
    () => ({
      "V1 Arbitrum": totalFees?.[ARBITRUM] || 0,
      "V2 Arbitrum": v2MarketsOverview && formatAmount(v2MarketsOverview?.[ARBITRUM]?.totalFees, USD_DECIMALS, 0),
      "V1 Avalanche": totalFees?.[AVALANCHE],
      "V2 Avalanche": v2MarketsOverview && formatAmount(v2MarketsOverview?.[AVALANCHE]?.totalFees, USD_DECIMALS, 0),
    }),
    [totalFees, v2MarketsOverview]
  );

  const totalVolumeEntries = useMemo(
    () => ({
      "V1 Arbitrum": totalVolume?.[ARBITRUM],
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.totalVolume,
      "V1 Avalanche": totalVolume?.[AVALANCHE],
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.totalVolume,
    }),
    [totalVolume, v2MarketsOverview]
  );

  const uniqueUsersEnttries = useMemo(
    () => ({
      "V1 Arbitrum": uniqueUsers?.[ARBITRUM],
      "V2 Arbitrum": v2MarketsOverview?.[ARBITRUM]?.totalUsers,
      "V1 Avalanche": uniqueUsers?.[AVALANCHE],
      "V2 Avalanche": v2MarketsOverview?.[AVALANCHE]?.totalUsers,
    }),
    [uniqueUsers, v2MarketsOverview]
  );

  const stakedEntries = useMemo(
    () => ({
      "Staked on Arbitrum": arbitrumStakedGmx,
      "Staked on Avalanche": avaxStakedGmx,
    }),
    [arbitrumStakedGmx, avaxStakedGmx]
  );

  return (
    <SEO title={getPageTitle(t`Dashboard`)}>
      <div className="default-container DashboardV2 page-layout">
        <PageTitle
          title={t`Stats`}
          isTop
          subtitle={
            <div>
              <Trans>
                {chainName} Total Stats start from {totalStatsStartDate}.<br /> For detailed stats:
              </Trans>{" "}
              {chainId === ARBITRUM && <ExternalLink href="https://stats.gmx.io">V1 Analytics</ExternalLink>}
              {chainId === AVALANCHE && <ExternalLink href="https://stats.gmx.io/avalanche">V1 Analytics</ExternalLink>}
              {(chainId === ARBITRUM || chainId === AVALANCHE) && " | "}
              <ExternalLink href="https://dune.com/gmx-io/gmx-analytics">V2 Analytics</ExternalLink>
              {" | "}
              <ExternalLink href="https://app.gmx.io/#/stats">V2 Pools Stats</ExternalLink>.
            </div>
          }
        />
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <div className="App-card">
              <div className="App-card-title">
                <Trans>Overview</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>AUM</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="bottom-end"
                      renderContent={() => (
                        <span>{t`Assets Under Management: GMX staked (All chains) + GLP pool (${chainName}) +  GM Pools (${chainName}).`}</span>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>GLP Pool</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="bottom-end"
                      renderContent={() => (
                        <Trans>
                          <p>Total value of tokens in GLP pool ({chainName}).</p>
                          <p>
                            This value may be higher on other websites due to the collateral of positions being included
                            in the calculation.
                          </p>
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>GM Pools</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(currentV2MarketOverview?.totalGMLiquidity, USD_DECIMALS, 0, true)}`}
                      position="bottom-end"
                      renderContent={() => (
                        <Trans>
                          <p>GM Pools total value ({chainName}).</p>
                        </Trans>
                      )}
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
                      handle={`$${formatAmount(
                        sumBigInts(currentVolumeInfo?.[chainId], v2MarketsOverview?.[chainId]?.dailyVolume),
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => <ChainsStatsTooltipRow entries={dailyVolumeEntries} />}
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
                      handle={`$${formatAmount(
                        sumBigInts(
                          positionStatsInfo?.[chainId]?.openInterest,
                          v2MarketsOverview?.[chainId]?.openInterest
                        ),
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => <ChainsStatsTooltipRow entries={openInterestEntries} />}
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
                      handle={`$${formatAmount(
                        sumBigInts(
                          positionStatsInfo?.[chainId]?.totalLongPositionSizes,
                          v2MarketsOverview?.[chainId]?.totalLongPositionSizes
                        ),
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => <ChainsStatsTooltipRow entries={totalLongPositionSizesEntries} />}
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
                      handle={`$${formatAmount(
                        sumBigInts(
                          positionStatsInfo?.[chainId]?.totalShortPositionSizes,
                          v2MarketsOverview?.[chainId]?.totalShortPositionSizes
                        ),
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => <ChainsStatsTooltipRow entries={totalShortPositionSizesEntries} />}
                    />
                  </div>
                </div>
                {feesSummary?.lastUpdatedAt ? (
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Fees since</Trans> {formatDate(feesSummary.lastUpdatedAt)}
                    </div>
                    <div>
                      <TooltipComponent
                        position="bottom-end"
                        className="whitespace-nowrap"
                        handle={`$${formatAmount(
                          sumBigInts(currentFees?.[chainId], v2MarketsOverview?.[chainId]?.weeklyFees),
                          USD_DECIMALS,
                          2,
                          true
                        )}`}
                        renderContent={() => <ChainsStatsTooltipRow entries={weeklyFeesEntries} />}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">
                <Trans>Total Stats</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Fees</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={`$${numberWithCommas(
                        sumBigInts(
                          totalFees?.[chainId],
                          BigInt(formatAmount(v2MarketsOverview?.[chainId]?.totalFees ?? 0n, USD_DECIMALS, 0))
                        )
                      )}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow decimalsForConversion={0} entries={marketsOverviewEntries} />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Volume</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={`$${formatAmount(
                        sumBigInts(totalVolume?.[chainId], v2MarketsOverview?.[chainId]?.totalVolume),
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => <ChainsStatsTooltipRow entries={totalVolumeEntries} />}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Users</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={formatAmount(
                        sumBigInts(uniqueUsers?.[chainId], v2MarketsOverview?.[chainId]?.totalUsers),
                        0,
                        0,
                        true
                      )}
                      renderContent={() => (
                        <ChainsStatsTooltipRow showDollar={false} shouldFormat={false} entries={uniqueUsersEnttries} />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Treasury</Trans>
                  </div>
                  <div>${formatAmount(totalTreasuryFundUsd, 30, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <PageTitle
            title={t`Tokens`}
            afterTitle={<VersionSwitch className="ml-15" />}
            subtitle={
              tradePageVersion === 1 ? (
                <>
                  <Trans>
                    GMX is the utility and governance token. Accrues 30% and 27% of V1 and V2 markets generated fees,
                    respectively.
                  </Trans>
                  <br />
                  <Trans>
                    GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of the V1 markets generated
                    fees.
                  </Trans>
                </>
              ) : (
                <>
                  <Trans>
                    GMX is the utility and governance token. Accrues 30% and 27% of V1 and V2 markets generated fees,
                    respectively.
                  </Trans>
                  <br />
                  <Trans>
                    GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
                  </Trans>
                </>
              )
            }
          />
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--gmx">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={currentIcons.gmx} width="40" alt="GMX Token Icon" />
                      </div>
                      <div className="App-card-title-mark-info">
                        <div className="App-card-title-mark-title">GMX</div>
                        <div className="App-card-title-mark-subtitle">GMX</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol="GMX" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>
                        {!gmxPrice && "..."}
                        {gmxPrice && (
                          <TooltipComponent
                            position="bottom-end"
                            className="whitespace-nowrap"
                            handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                            renderContent={() => (
                              <>
                                <StatsTooltipRow
                                  label={t`Price on Arbitrum`}
                                  value={formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, 2, true)}
                                  showDollar={true}
                                />
                                <StatsTooltipRow
                                  label={t`Price on Avalanche`}
                                  value={formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                                  showDollar={true}
                                />
                              </>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Supply</Trans>
                      </div>
                      <div>{formatAmount(totalGmxSupply, GMX_DECIMALS, 0, true)} GMX</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Total Staked</Trans>
                      </div>
                      <div>
                        <TooltipComponent
                          position="bottom-end"
                          className="whitespace-nowrap"
                          handle={`$${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}`}
                          renderContent={() => (
                            <ChainsStatsTooltipRow
                              decimalsForConversion={GMX_DECIMALS}
                              showDollar={false}
                              entries={stakedEntries}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Market Cap</Trans>
                      </div>
                      <div>${formatAmount(gmxMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                  </div>
                </div>
                <InteractivePieChart data={gmxDistributionData} label={t`Distribution`} />
              </div>
              {isV1 && (
                <div className="App-card">
                  <div className="stats-block">
                    <div className="App-card-title">
                      <div className="App-card-title-mark">
                        <div className="App-card-title-mark-icon">
                          <img src={currentIcons.glp} width="40" alt="GLP Icon" />
                        </div>
                        <div className="App-card-title-mark-info">
                          <div className="App-card-title-mark-title">GLP</div>
                          <div className="App-card-title-mark-subtitle">GLP</div>
                        </div>
                        <div>
                          <AssetDropdown assetSymbol="GLP" />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Price</Trans>
                        </div>
                        <div>${formatAmount(glpPrice, USD_DECIMALS, 3, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Supply</Trans>
                        </div>
                        <div>{formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Total Staked</Trans>
                        </div>
                        <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Market Cap</Trans>
                        </div>
                        <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Stablecoin Percentage</Trans>
                        </div>
                        <div>{stablePercentage}%</div>
                      </div>
                    </div>
                  </div>
                  <InteractivePieChart data={glpPool} label={t`GLP Pool`} />
                </div>
              )}
              {isV2 && <GMCard />}
            </div>
            {isV1 && visibleTokens.length > 0 && (
              <>
                <div className="token-table-wrapper App-card">
                  <div className="App-card-title">
                    <Trans>GLP Index Composition</Trans>{" "}
                    <img src={currentIcons.network} width="16" alt="Network Icon" />
                  </div>
                  <div className="App-card-divider" />
                  <table className="token-table">
                    <thead>
                      <tr>
                        <th>
                          <Trans>TOKEN</Trans>
                        </th>
                        <th>
                          <Trans>PRICE</Trans>
                        </th>
                        <th>
                          <Trans>POOL</Trans>
                        </th>
                        <th>
                          <Trans>WEIGHT</Trans>
                        </th>
                        <th>
                          <Trans>UTILIZATION</Trans>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTokens.map((token) => {
                        const tokenInfo = infoTokens[token.address];
                        let utilization = 0n;
                        if (
                          tokenInfo &&
                          tokenInfo.reservedAmount !== undefined &&
                          tokenInfo.poolAmount !== undefined &&
                          tokenInfo.poolAmount > 0
                        ) {
                          utilization = bigMath.mulDiv(
                            tokenInfo.reservedAmount,
                            BASIS_POINTS_DIVISOR_BIGINT,
                            tokenInfo.poolAmount
                          );
                        }
                        let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                        if (tokenInfo.maxUsdgAmount !== undefined && tokenInfo.maxUsdgAmount > 0) {
                          maxUsdgAmount = tokenInfo.maxUsdgAmount;
                        }

                        return (
                          <tr key={token.address}>
                            <td>
                              <div className="token-symbol-wrapper">
                                <div className="App-card-title-info">
                                  <div className="App-card-title-info-icon">
                                    <TokenIcon symbol={token.symbol} displaySize={40} importSize={40} />
                                  </div>
                                  <div className="App-card-title-info-text">
                                    <div className="App-card-info-title">{token.name}</div>
                                    <div className="App-card-info-subtitle">{token.symbol}</div>
                                  </div>
                                  <div>
                                    <AssetDropdown token={token} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                            <td>
                              <TooltipComponent
                                handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                                position="bottom-end"
                                className="whitespace-nowrap"
                                renderContent={() => {
                                  return (
                                    <>
                                      <StatsTooltipRow
                                        label={t`Pool Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "managedAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Target Min Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "bufferAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Max ${tokenInfo.symbol} Capacity`}
                                        value={formatAmount(maxUsdgAmount, 18, 0, true)}
                                        showDollar={true}
                                      />
                                    </>
                                  );
                                }}
                              />
                            </td>
                            <td>{getWeightText(tokenInfo)}</td>
                            <td>{formatAmount(utilization, 2, 2, false)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="glp-composition-small">
                  <PageTitle title={t`GLP Index Composition`} />
                </div>

                <div className="token-grid">
                  {visibleTokens.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = 0n;
                    if (
                      tokenInfo &&
                      tokenInfo.reservedAmount !== undefined &&
                      tokenInfo.poolAmount !== undefined &&
                      tokenInfo.poolAmount > 0
                    ) {
                      utilization = bigMath.mulDiv(
                        tokenInfo.reservedAmount,
                        BASIS_POINTS_DIVISOR_BIGINT,
                        tokenInfo.poolAmount
                      );
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount !== undefined && tokenInfo.maxUsdgAmount > 0) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }

                    return (
                      <div className="App-card" key={token.symbol}>
                        <div className="App-card-title">
                          <div className="mobile-token-card">
                            <TokenIcon symbol={token.symbol} importSize={24} displaySize={24} />
                            <div className="token-symbol-text">{token.symbol}</div>
                            <div>
                              <AssetDropdown token={token} />
                            </div>
                          </div>
                        </div>
                        <div className="App-card-divider"></div>
                        <div className="App-card-content">
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Price</Trans>
                            </div>
                            <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Pool</Trans>
                            </div>
                            <div>
                              <TooltipComponent
                                handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                                position="bottom-end"
                                renderContent={() => {
                                  return (
                                    <>
                                      <StatsTooltipRow
                                        label={t`Pool Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "managedAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Target Min Amount`}
                                        value={`${formatKeyAmount(
                                          tokenInfo,
                                          "bufferAmount",
                                          token.decimals,
                                          0,
                                          true
                                        )} ${token.symbol}`}
                                        showDollar={false}
                                      />
                                      <StatsTooltipRow
                                        label={t`Max ${tokenInfo.symbol} Capacity`}
                                        value={formatAmount(maxUsdgAmount, 18, 0, true)}
                                      />
                                    </>
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Weight</Trans>
                            </div>
                            <div>{getWeightText(tokenInfo)}</div>
                          </div>
                          <div className="App-card-row">
                            <div className="label">
                              <Trans>Utilization</Trans>
                            </div>
                            <div>{formatAmount(utilization, 2, 2, false)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {isV2 && getIsSyntheticsSupported(chainId) && (
              <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
                <MarketsList />
              </SyntheticsStateContextProvider>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}

function GMCard() {
  const { chainId } = useChainId();
  const currentIcons = getIcons(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const totalGMSupply = useMemo(
    () =>
      Object.values(marketTokensData || {}).reduce(
        (acc, { totalSupply, decimals, prices }) => ({
          amount: acc.amount + (totalSupply ?? 0n),
          usd: acc.usd + (convertToUsd(totalSupply, decimals, prices?.maxPrice) ?? 0n),
        }),
        { amount: BN_ZERO, usd: BN_ZERO }
      ),
    [marketTokensData]
  );

  const chartData = useMemo(() => {
    if (totalGMSupply?.amount === undefined || totalGMSupply?.amount <= 0 || !marketsInfoData) return [];

    const poolsByIndexToken = groupBy(
      Object.values(marketsInfoData || EMPTY_OBJECT),
      (market) => market[market.isSpotOnly ? "marketTokenAddress" : "indexTokenAddress"]
    );

    return Object.values(poolsByIndexToken || EMPTY_OBJECT).map((pools) => {
      const totalMarketUSD = pools.reduce((acc, pool) => acc + pool.poolValueMax, BN_ZERO);

      const marketInfo = pools[0];
      const indexToken = marketInfo.isSpotOnly ? marketInfo.shortToken : marketInfo.indexToken;
      const marketSupplyPercentage =
        Number(bigMath.mulDiv(totalMarketUSD, BASIS_POINTS_DIVISOR_BIGINT, totalGMSupply.usd)) / 100;

      return {
        fullName: marketInfo.name,
        name: marketInfo.isSpotOnly ? getMarketPoolName(marketInfo) : getMarketIndexName(marketInfo),
        value: marketSupplyPercentage,
        color: TOKEN_COLOR_MAP[indexToken.baseSymbol ?? indexToken.symbol ?? "default"] ?? TOKEN_COLOR_MAP.default,
      };
    });
  }, [marketsInfoData, totalGMSupply]);

  return (
    <div className="App-card">
      <div className="stats-block">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon">
              <img src={currentIcons.gm} width="40" alt="GM Icon" />
            </div>
            <div className="App-card-title-mark-info">
              <div className="App-card-title-mark-title">GM</div>
              <div className="App-card-title-mark-subtitle">GM</div>
            </div>
            <div>
              <AssetDropdown assetSymbol="GM" />
            </div>
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Supply</Trans>
            </div>

            <div>
              {formatTokenAmount(totalGMSupply?.amount, 18, "GM", {
                useCommas: true,
                fallbackToZero: true,
                displayDecimals: 0,
              })}
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Market Cap</Trans>
            </div>
            <div>
              {formatUsd(totalGMSupply?.usd, {
                displayDecimals: 0,
              })}
            </div>
          </div>
        </div>
      </div>
      <InteractivePieChart data={chartData} label={t`GM Markets`} />
    </div>
  );
}

function sumBigInts(...args: (bigint | number | undefined)[]) {
  return args.reduce<bigint>((acc, value) => acc + BigInt(value ?? 0n), 0n);
}
