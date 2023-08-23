import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import TooltipComponent from "components/Tooltip/Tooltip";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import useSWR from "swr";

import { ethers } from "ethers";
import hexToRgba from "hex-to-rgba";

import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { DEFAULT_MAX_USDG_AMOUNT, GLP_DECIMALS, GMX_DECIMALS, USD_DECIMALS, getPageTitle } from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";

import { getContract } from "config/contracts";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import VaultV2 from "abis/VaultV2.json";
import Footer from "components/Footer/Footer";

import "./DashboardV2.css";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";
import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getIsSyntheticsSupported } from "config/features";
import { getIcons } from "config/icons";
import { GLP_POOL_COLORS, getTokenBySymbol, getWhitelistedV1Tokens } from "config/tokens";
import { useFeesSummary, useTotalVolume, useVolumeInfo } from "domain/stats";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import { useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { formatDate } from "lib/dates";
import { arrayURLFetcher } from "lib/fetcher";
import { bigNumberify, expandDecimals, formatAmount, formatKeyAmount, numberWithCommas } from "lib/numbers";
import AssetDropdown from "./AssetDropdown";
import TokenIcon from "components/TokenIcon/TokenIcon";
import PageTitle from "components/PageTitle/PageTitle";
const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

const { AddressZero } = ethers.constants;

function getPositionStats(positionStats) {
  if (!positionStats || positionStats.length === 0) {
    return null;
  }
  return positionStats.reduce(
    (acc, cv, i) => {
      cv.openInterest = bigNumberify(cv.totalLongPositionSizes).add(cv.totalShortPositionSizes).toString();
      acc.totalLongPositionSizes = acc.totalLongPositionSizes.add(cv.totalLongPositionSizes);
      acc.totalShortPositionSizes = acc.totalShortPositionSizes.add(cv.totalShortPositionSizes);
      acc.totalOpenInterest = acc.totalOpenInterest.add(cv.openInterest);

      acc[ACTIVE_CHAIN_IDS[i]] = cv;
      return acc;
    },
    {
      totalLongPositionSizes: bigNumberify(0),
      totalShortPositionSizes: bigNumberify(0),
      totalOpenInterest: bigNumberify(0),
    }
  );
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0);
  }

  let currentFeesUsd = bigNumberify(0);
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.contractMinPrice) {
      continue;
    }

    const feeUsd = fees[i].mul(tokenInfo.contractMinPrice).div(expandDecimals(1, tokenInfo.decimals));
    currentFeesUsd = currentFeesUsd.add(feeUsd);
  }

  return currentFeesUsd;
}

export default function DashboardV2() {
  const { active, library } = useWeb3React();
  const { chainId } = useChainId();
  const totalVolume = useTotalVolume();

  const uniqueUsers = useUniqueUsers();
  const chainName = getChainName(chainId);
  const currentIcons = getIcons(chainId);
  const { data: positionStats } = useSWR(
    ACTIVE_CHAIN_IDS.map((chainId) => getServerUrl(chainId, "/position_stats")),
    {
      fetcher: arrayURLFetcher,
    }
  );

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
    fetcher: contractFetcher(library, GlpManager),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: contractFetcher(library, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  const { infoTokens: infoTokensArbitrum } = useInfoTokens(null, ARBITRUM, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(null, AVALANCHE, active, undefined, undefined);

  const { data: currentFees } = useSWR(
    infoTokensArbitrum[AddressZero].contractMinPrice && infoTokensAvax[AddressZero].contractMinPrice
      ? "Dashboard:currentFees"
      : null,
    {
      fetcher: () => {
        return Promise.all(
          ACTIVE_CHAIN_IDS.map((chainId) =>
            contractFetcher(null, ReaderV2, [getWhitelistedTokenAddresses(chainId)])(
              `Dashboard:fees:${chainId}`,
              chainId,
              getContract(chainId, "Reader"),
              "getFees",
              getContract(chainId, "Vault")
            )
          )
        ).then((fees) => {
          return fees.reduce(
            (acc, cv, i) => {
              const feeUSD = getCurrentFeesUsd(
                getWhitelistedTokenAddresses(ACTIVE_CHAIN_IDS[i]),
                cv,
                ACTIVE_CHAIN_IDS[i] === ARBITRUM ? infoTokensArbitrum : infoTokensAvax
              );
              acc[ACTIVE_CHAIN_IDS[i]] = feeUSD;
              acc.total = acc.total.add(feeUSD);
              return acc;
            },
            { total: bigNumberify(0) }
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
    parseInt(Date.now() / 1000) - feesSummaryByChain[chainId]?.lastUpdatedAt > 60 * 60;

  const totalFees = ACTIVE_CHAIN_IDS.map((chainId) => {
    if (shouldIncludeCurrrentFees && currentFees && currentFees[chainId]) {
      return currentFees[chainId].div(expandDecimals(1, USD_DECIMALS)).add(feesSummaryByChain[chainId]?.totalFees || 0);
    }

    return feesSummaryByChain[chainId].totalFees || 0;
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
    { arbitrum: chainId === ARBITRUM ? library : undefined },
    active
  );

  let { total: totalGmxInLiquidity } = useTotalGmxInLiquidity(chainId, active);

  let { avax: avaxStakedGmx, arbitrum: arbitrumStakedGmx, total: totalStakedGmx } = useTotalGmxStaked();

  let gmxMarketCap;
  if (gmxPrice && totalGmxSupply) {
    gmxMarketCap = gmxPrice.mul(totalGmxSupply).div(expandDecimals(1, GMX_DECIMALS));
  }

  let stakedGmxSupplyUsd;
  if (gmxPrice && totalStakedGmx) {
    stakedGmxSupplyUsd = totalStakedGmx.mul(gmxPrice).div(expandDecimals(1, GMX_DECIMALS));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
  }

  let glpPrice;
  let glpSupply;
  let glpMarketCap;
  if (aum && totalSupplies && totalSupplies[3]) {
    glpSupply = totalSupplies[3];
    glpPrice =
      aum && aum.gt(0) && glpSupply.gt(0)
        ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(glpSupply)
        : expandDecimals(1, USD_DECIMALS);
    glpMarketCap = glpPrice.mul(glpSupply).div(expandDecimals(1, GLP_DECIMALS));
  }

  let tvl;
  if (glpMarketCap && gmxPrice && totalStakedGmx) {
    tvl = glpMarketCap.add(gmxPrice.mul(totalStakedGmx).div(expandDecimals(1, GMX_DECIMALS)));
  }

  const ethFloorPriceFund = expandDecimals(350 + 148 + 384, 18);
  const glpFloorPriceFund = expandDecimals(660001, 18);
  const usdcFloorPriceFund = expandDecimals(784598 + 200000, 30);

  let totalFloorPriceFundUsd;

  if (eth && eth.contractMinPrice && glpPrice) {
    const ethFloorPriceFundUsd = ethFloorPriceFund.mul(eth.contractMinPrice).div(expandDecimals(1, eth.decimals));
    const glpFloorPriceFundUsd = glpFloorPriceFund.mul(glpPrice).div(expandDecimals(1, 18));

    totalFloorPriceFundUsd = ethFloorPriceFundUsd.add(glpFloorPriceFundUsd).add(usdcFloorPriceFund);
  }

  let adjustedUsdgSupply = bigNumberify(0);

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount) {
      adjustedUsdgSupply = adjustedUsdgSupply.add(tokenInfo.usdgAmount);
    }
  }

  const getWeightText = (tokenInfo) => {
    if (
      !tokenInfo.weight ||
      !tokenInfo.usdgAmount ||
      !adjustedUsdgSupply ||
      adjustedUsdgSupply.eq(0) ||
      !totalTokenWeights
    ) {
      return "...";
    }

    const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
    // use add(1).div(10).mul(10) to round numbers up
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights).add(1).div(10).mul(10);

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(
      targetWeightBps,
      2,
      2,
      false
    )}%`;

    return (
      <TooltipComponent
        handle={weightText}
        position="right-bottom"
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
              {currentWeightBps.lt(targetWeightBps) && (
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
              {currentWeightBps.gt(targetWeightBps) && (
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
                  <Trans>More Info</Trans>
                </ExternalLink>
              </div>
            </>
          );
        }}
      />
    );
  };

  let stakedPercent = 0;

  if (totalGmxSupply && !totalGmxSupply.isZero() && !totalStakedGmx.isZero()) {
    stakedPercent = totalStakedGmx.mul(100).div(totalGmxSupply).toNumber();
  }

  let liquidityPercent = 0;

  if (totalGmxSupply && !totalGmxSupply.isZero() && totalGmxInLiquidity) {
    liquidityPercent = totalGmxInLiquidity.mul(100).div(totalGmxSupply).toNumber();
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent;

  let gmxDistributionData = [
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

  const totalStatsStartDate = chainId === AVALANCHE ? t`06 Jan 2022` : t`01 Sep 2021`;

  let stableGlp = 0;
  let totalGlp = 0;

  let glpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdgAmount && adjustedUsdgSupply && adjustedUsdgSupply.gt(0)) {
      const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(adjustedUsdgSupply);
      if (tokenInfo.isStable) {
        stableGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      }
      totalGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
      return {
        fullname: token.name,
        name: token.symbol,
        value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
      };
    }
    return null;
  });

  let stablePercentage = totalGlp > 0 ? ((stableGlp * 100) / totalGlp).toFixed(2) : "0.0";

  glpPool = glpPool.filter(function (element) {
    return element !== null;
  });

  glpPool = glpPool.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  gmxDistributionData = gmxDistributionData.sort(function (a, b) {
    if (a.value < b.value) return 1;
    else return -1;
  });

  const [gmxActiveIndex, setGMXActiveIndex] = useState(null);

  const onGMXDistributionChartEnter = (_, index) => {
    setGMXActiveIndex(index);
  };

  const onGMXDistributionChartLeave = (_, index) => {
    setGMXActiveIndex(null);
  };

  const [glpActiveIndex, setGLPActiveIndex] = useState(null);

  const onGLPPoolChartEnter = (_, index) => {
    setGLPActiveIndex(index);
  };

  const onGLPPoolChartLeave = (_, index) => {
    setGLPActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="stats-label">
          <div className="stats-label-color" style={{ backgroundColor: payload[0].color }}></div>
          {payload[0].value}% {payload[0].name}
        </div>
      );
    }

    return null;
  };

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
              {chainId === ARBITRUM && <ExternalLink href="https://stats.gmx.io">V1</ExternalLink>}
              {chainId === AVALANCHE && <ExternalLink href="https://stats.gmx.io/avalanche">V1</ExternalLink>} |{" "}
              <ExternalLink href="https://dune.com/gmx-io/gmx-analytics">V2</ExternalLink>.
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
                      position="right-bottom"
                      renderContent={() => (
                        <span>{t`Assets Under Management: GMX staked (All chains) + GLP pool (${chainName}).`}</span>
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
                      position="right-bottom"
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
                    <Trans>24h Volume</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(currentVolumeInfo?.[chainId], USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Volume`}
                          arbitrumValue={currentVolumeInfo?.[ARBITRUM]}
                          avaxValue={currentVolumeInfo?.[AVALANCHE]}
                          total={currentVolumeInfo?.total}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Open Interest</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(positionStatsInfo?.[chainId]?.openInterest, USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Open Interest`}
                          arbitrumValue={positionStatsInfo?.[ARBITRUM].openInterest}
                          avaxValue={positionStatsInfo?.[AVALANCHE].openInterest}
                          total={positionStatsInfo?.totalOpenInterest}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Long Positions</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId]?.totalLongPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Long Positions`}
                          arbitrumValue={positionStatsInfo?.[ARBITRUM].totalLongPositionSizes}
                          avaxValue={positionStatsInfo?.[AVALANCHE].totalLongPositionSizes}
                          total={positionStatsInfo?.totalLongPositionSizes}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Short Positions</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(
                        positionStatsInfo?.[chainId]?.totalShortPositionSizes,
                        USD_DECIMALS,
                        0,
                        true
                      )}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Short Positions`}
                          arbitrumValue={positionStatsInfo?.[ARBITRUM].totalShortPositionSizes}
                          avaxValue={positionStatsInfo?.[AVALANCHE].totalShortPositionSizes}
                          total={positionStatsInfo?.totalShortPositionSizes}
                        />
                      )}
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
                        position="right-bottom"
                        className="nowrap"
                        handle={`$${formatAmount(currentFees?.[chainId], USD_DECIMALS, 2, true)}`}
                        renderContent={() => (
                          <ChainsStatsTooltipRow
                            title={t`Fees`}
                            arbitrumValue={currentFees?.[ARBITRUM]}
                            avaxValue={currentFees?.[AVALANCHE]}
                            total={currentFees?.total}
                          />
                        )}
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
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${numberWithCommas(totalFees?.[chainId])}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Fees`}
                          arbitrumValue={totalFees?.[ARBITRUM]}
                          avaxValue={totalFees?.[AVALANCHE]}
                          total={totalFees?.total}
                          decimalsForConversion={0}
                        />
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
                      position="right-bottom"
                      className="nowrap"
                      handle={`$${formatAmount(totalVolume?.[chainId], USD_DECIMALS, 0, true)}`}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Volume`}
                          arbitrumValue={totalVolume?.[ARBITRUM]}
                          avaxValue={totalVolume?.[AVALANCHE]}
                          total={totalVolume?.total}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Users</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      position="right-bottom"
                      className="nowrap"
                      handle={formatAmount(uniqueUsers?.[chainId], 0, 0, true)}
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          title={t`Total Users`}
                          arbitrumValue={uniqueUsers?.[ARBITRUM]}
                          avaxValue={uniqueUsers?.[AVALANCHE]}
                          total={uniqueUsers?.total}
                          showDollar={false}
                          shouldFormat={false}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Floor Price Fund</Trans>
                  </div>
                  <div>${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <PageTitle title={t`Tokens`} subtitle={t`Platform, GLP and GM tokens.`} />
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
                            position="right-bottom"
                            className="nowrap"
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
                          position="right-bottom"
                          className="nowrap"
                          handle={`$${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}`}
                          renderContent={() => (
                            <ChainsStatsTooltipRow
                              title={t`Staked`}
                              arbitrumValue={arbitrumStakedGmx}
                              avaxValue={avaxStakedGmx}
                              total={totalStakedGmx}
                              decimalsForConversion={GMX_DECIMALS}
                              showDollar={false}
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
                <div className="stats-piechart" onMouseLeave={onGMXDistributionChartLeave}>
                  {gmxDistributionData.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={gmxDistributionData}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        onMouseEnter={onGMXDistributionChartEnter}
                        onMouseOut={onGMXDistributionChartLeave}
                        onMouseLeave={onGMXDistributionChartLeave}
                      >
                        {gmxDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{
                              filter:
                                gmxActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={entry.color}
                            strokeWidth={gmxActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        <Trans>Distribution</Trans>
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
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
                <div className="stats-piechart" onMouseOut={onGLPPoolChartLeave}>
                  {glpPool.length > 0 && (
                    <PieChart width={210} height={210}>
                      <Pie
                        data={glpPool}
                        cx={100}
                        cy={100}
                        innerRadius={73}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        onMouseEnter={onGLPPoolChartEnter}
                        onMouseOut={onGLPPoolChartLeave}
                        onMouseLeave={onGLPPoolChartLeave}
                        paddingAngle={2}
                      >
                        {glpPool.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={GLP_POOL_COLORS[entry.name]}
                            style={{
                              filter:
                                glpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(GLP_POOL_COLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={GLP_POOL_COLORS[entry.name]}
                            strokeWidth={glpActiveIndex === index ? 1 : 1}
                          />
                        ))}
                      </Pie>
                      <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
                        GLP Pool
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
            {visibleTokens.length > 0 && (
              <>
                <div className="token-table-wrapper App-card">
                  <div className="App-card-title">
                    <Trans>GLP Index Composition</Trans>{" "}
                    <img src={currentIcons.network} width="16" alt="Network Icon" />
                  </div>
                  <div className="App-card-divider"></div>
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
                        let utilization = bigNumberify(0);
                        if (
                          tokenInfo &&
                          tokenInfo.reservedAmount &&
                          tokenInfo.poolAmount &&
                          tokenInfo.poolAmount.gt(0)
                        ) {
                          utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                        }
                        let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                        if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
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
                                    <AssetDropdown assetSymbol={token.symbol} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                            <td>
                              <TooltipComponent
                                handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                                position="right-bottom"
                                className="nowrap"
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
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }

                    return (
                      <div className="App-card" key={token.symbol}>
                        <div className="App-card-title">
                          <div className="mobile-token-card">
                            <TokenIcon symbol={token.symbol} importSize={24} displaySize={24} />
                            <div className="token-symbol-text">{token.symbol}</div>
                            <div>
                              <AssetDropdown assetSymbol={token.symbol} />
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
                                position="right-bottom"
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

            {getIsSyntheticsSupported(chainId) && <MarketsList />}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
