import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import TooltipComponent from "../../components/Tooltip/Tooltip";

import hexToRgba from "hex-to-rgba";
import { ethers } from "ethers";

import { getWhitelistedTokens, getTokenBySymbol } from "../../data/Tokens";
import { getFeeHistory } from "../../data/Fees";

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  getChainName,
  useChainId,
  USD_DECIMALS,
  GMX_DECIMALS,
  GLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  ARBITRUM,
  AVALANCHE,
  getTotalVolumeSum,
  GLPPOOLCOLORS,
  DEFAULT_MAX_USDG_AMOUNT,
  getPageTitle,
} from "../../Helpers";
import { useTotalGmxInLiquidity, useGmxPrice, useTotalGmxStaked, useTotalGmxSupply, useInfoTokens } from "../../Api";

import { getContract } from "../../Addresses";

import VaultV2 from "../../abis/VaultV2.json";
import ReaderV2 from "../../abis/ReaderV2.json";
import GlpManager from "../../abis/GlpManager.json";
import Footer from "../../Footer";

import "./DashboardV2.css";

import gmx40Icon from "../../img/ic_gmx_40.svg";
import glp40Icon from "../../img/ic_glp_40.svg";
import avalanche16Icon from "../../img/ic_avalanche_16.svg";
import arbitrum16Icon from "../../img/ic_arbitrum_16.svg";
import arbitrum24Icon from "../../img/ic_arbitrum_24.svg";
import avalanche24Icon from "../../img/ic_avalanche_24.svg";

import AssetDropdown from "./AssetDropdown";
import SEO from "../../components/Common/SEO";

const { AddressZero } = ethers.constants;

function getVolumeInfo(hourlyVolume) {
  if (!hourlyVolume || hourlyVolume.length === 0) {
    return {};
  }

  const secondsPerHour = 60 * 60;
  const minTime = parseInt(Date.now() / 1000 / secondsPerHour) * secondsPerHour - 24 * secondsPerHour;

  const info = {};
  let totalVolume = bigNumberify(0);
  for (let i = 0; i < hourlyVolume.length; i++) {
    const item = hourlyVolume[i].data;
    if (parseInt(item.timestamp) < minTime) {
      break;
    }

    if (!info[item.token]) {
      info[item.token] = bigNumberify(0);
    }

    info[item.token] = info[item.token].add(item.volume);
    totalVolume = totalVolume.add(item.volume);
  }

  info.totalVolume = totalVolume;

  return info;
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

  const chainName = getChainName(chainId);

  const positionStatsUrl = getServerUrl(chainId, "/position_stats");
  const { data: positionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const hourlyVolumeUrl = getServerUrl(chainId, "/hourly_volume");
  const { data: hourlyVolume } = useSWR([hourlyVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume");
  const { data: totalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  let { total: totalGmxSupply } = useTotalGmxSupply();

  let totalLongPositionSizes;
  let totalShortPositionSizes;
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes);
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes);
  }

  const volumeInfo = getVolumeInfo(hourlyVolume);

  const totalVolumeSum = getTotalVolumeSum(totalVolume);

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const glpManagerAddress = getContract(chainId, "GlpManager");

  const gmxAddress = getContract(chainId, "GMX");
  const glpAddress = getContract(chainId, "GLP");
  const usdgAddress = getContract(chainId, "USDG");

  const tokensForSupplyQuery = [gmxAddress, glpAddress, usdgAddress];

  const { data: aums } = useSWR([`Dashboard:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  });

  const { data: fees } = useSWR([`Dashboard:fees:${active}`, chainId, readerAddress, "getFees", vaultAddress], {
    fetcher: fetcher(library, ReaderV2, [whitelistedTokenAddresses]),
  });

  const { data: totalSupplies } = useSWR(
    [`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero],
    {
      fetcher: fetcher(library, ReaderV2, [tokensForSupplyQuery]),
    }
  );

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, VaultV2),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];
  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens);

  const feeHistory = getFeeHistory(chainId);
  const shouldIncludeCurrrentFees = feeHistory.length && parseInt(Date.now() / 1000) - feeHistory[0].to > 60 * 60;
  let totalFeesDistributed = shouldIncludeCurrrentFees
    ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100
    : 0;
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd);
  }

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
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights);

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
              Current Weight: {formatAmount(currentWeightBps, 2, 2, false)}%<br />
              Target Weight: {formatAmount(targetWeightBps, 2, 2, false)}%<br />
              <br />
              {currentWeightBps.lt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is below its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/buy_glp" target="_blank" rel="noopener noreferrer">
                    buy GLP
                  </Link>{" "}
                  with {tokenInfo.symbol},&nbsp; and to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  {tokenInfo.symbol} for other tokens.
                </div>
              )}
              {currentWeightBps.gt(targetWeightBps) && (
                <div>
                  {tokenInfo.symbol} is above its target weight.
                  <br />
                  <br />
                  Get lower fees to{" "}
                  <Link to="/trade" target="_blank" rel="noopener noreferrer">
                    swap
                  </Link>{" "}
                  tokens for {tokenInfo.symbol}.
                </div>
              )}
              <br />
              <div>
                <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
                  More Info
                </a>
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
      name: "staked",
      value: stakedPercent,
      color: "#4353fa",
    },
    {
      name: "in liquidity",
      value: liquidityPercent,
      color: "#0598fa",
    },
    {
      name: "not staked",
      value: notStakedPercent,
      color: "#5c0af5",
    },
  ];

  const totalStatsStartDate = chainId === AVALANCHE ? "06 Jan 2022" : "01 Sep 2021";

  let stableGlp = 0;
  let totalGlp = 0;

  let glpPool = tokenList.map((token) => {
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo.usdgAmount && adjustedUsdgSupply) {
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
    <SEO title={getPageTitle("Dashboard")}>
      <div className="default-container DashboardV2 page-layout">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">
              Stats {chainId === AVALANCHE && <img src={avalanche24Icon} alt="avalanche24Icon" />}
              {chainId === ARBITRUM && <img src={arbitrum24Icon} alt="arbitrum24Icon" />}
            </div>
            <div className="Page-description">
              {chainName} Total Stats start from {totalStatsStartDate}.<br /> For detailed stats:{" "}
              {chainId === ARBITRUM && (
                <a href="https://stats.gmx.io" target="_blank" rel="noopener noreferrer">
                  https://stats.gmx.io
                </a>
              )}
              {chainId === AVALANCHE && (
                <a href="https://stats.gmx.io/avalanche" target="_blank" rel="noopener noreferrer">
                  https://stats.gmx.io/avalanche
                </a>
              )}
              .
            </div>
          </div>
        </div>
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <div className="App-card">
              <div className="App-card-title">Overview</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">AUM</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Assets Under Management: GMX staked (All chains) + GLP pool (${chainName})`}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">GLP Pool</div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                      position="right-bottom"
                      renderContent={() => `Total value of tokens in GLP pool (${chainName})`}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">24h Volume</div>
                  <div>${formatAmount(volumeInfo.totalVolume, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Long Positions</div>
                  <div>${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Short Positions</div>
                  <div>${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}</div>
                </div>
                {feeHistory.length ? (
                  <div className="App-card-row">
                    <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                    <div>${formatAmount(currentFeesUsd, USD_DECIMALS, 2, true)}</div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="App-card">
              <div className="App-card-title">Total Stats</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Total Fees</div>
                  <div>${numberWithCommas(totalFeesDistributed.toFixed(0))}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Total Volume</div>
                  <div>${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">Floor Price Fund</div>
                  <div>${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="Tab-title-section">
            <div className="Page-title">
              Tokens {chainId === AVALANCHE && <img src={avalanche24Icon} alt="avalanche24Icon" />}
              {chainId === ARBITRUM && <img src={arbitrum24Icon} alt="arbitrum24Icon" />}
            </div>
            <div className="Page-description">Platform and GLP index tokens.</div>
          </div>
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--gmx">
              <div className="App-card">
                <div className="stats-block">
                  <div className="App-card-title">
                    <div className="App-card-title-mark">
                      <div className="App-card-title-mark-icon">
                        <img src={gmx40Icon} alt="gmx40Icon" />
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
                      <div className="label">Price</div>
                      <div>
                        {!gmxPrice && "..."}
                        {gmxPrice && (
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                            renderContent={() => (
                              <>
                                Price on Arbitrum: ${formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, 2, true)}
                                <br />
                                Price on Avalanche: ${formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                              </>
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(totalGmxSupply, GMX_DECIMALS, 0, true)} GMX</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>
                        {
                          <TooltipComponent
                            position="right-bottom"
                            className="nowrap"
                            handle={`$${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}`}
                            renderContent={() => (
                              <>
                                Staked on Arbitrum: {formatAmount(arbitrumStakedGmx, GMX_DECIMALS, 0, true)} GMX
                                <br />
                                Staked on Avalanche: {formatAmount(avaxStakedGmx, GMX_DECIMALS, 0, true)} GMX
                              </>
                            )}
                          />
                        }
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
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
                        Distribution
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
                        <img src={glp40Icon} alt="glp40Icon" />
                        {chainId === ARBITRUM ? (
                          <img src={arbitrum16Icon} alt="arbitrum16Icon" className="selected-network-symbol" />
                        ) : (
                          <img src={avalanche16Icon} alt="avalanche16Icon" className="selected-network-symbol" />
                        )}
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
                      <div className="label">Price</div>
                      <div>${formatAmount(glpPrice, USD_DECIMALS, 3, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Supply</div>
                      <div>{formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Total Staked</div>
                      <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Market Cap</div>
                      <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Stablecoin Percentage</div>
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
                            fill={GLPPOOLCOLORS[entry.name]}
                            style={{
                              filter:
                                glpActiveIndex === index
                                  ? `drop-shadow(0px 0px 6px ${hexToRgba(GLPPOOLCOLORS[entry.name], 0.7)})`
                                  : "none",
                              cursor: "pointer",
                            }}
                            stroke={GLPPOOLCOLORS[entry.name]}
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
            <div className="token-table-wrapper App-card">
              <div className="App-card-title">
                GLP Index Composition {chainId === AVALANCHE && <img src={avalanche16Icon} alt="avalanche16Icon" />}
                {chainId === ARBITRUM && <img src={arbitrum16Icon} alt="arbitrum16Icon" />}
              </div>
              <div className="App-card-divider"></div>
              <table className="token-table">
                <thead>
                  <tr>
                    <th>TOKEN</th>
                    <th>PRICE</th>
                    <th>POOL</th>
                    <th>WEIGHT</th>
                    <th>UTILIZATION</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenList.map((token) => {
                    const tokenInfo = infoTokens[token.address];
                    let utilization = bigNumberify(0);
                    if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                      utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount);
                    }
                    let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
                    if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                      maxUsdgAmount = tokenInfo.maxUsdgAmount;
                    }

                    var tokenImage = null;

                    try {
                      tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
                    } catch (error) {
                      console.error(error);
                    }

                    return (
                      <tr key={token.symbol}>
                        <td>
                          <div className="token-symbol-wrapper">
                            <div className="App-card-title-info">
                              <div className="App-card-title-info-icon">
                                <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
                              </div>
                              <div className="App-card-title-info-text">
                                <div className="App-card-info-title">{token.name}</div>
                                <div className="App-card-info-subtitle">{token.symbol}</div>
                              </div>
                              <div>
                                <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                        <td>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
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
            <div className="token-grid">
              {tokenList.map((token) => {
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
                      <div style={{ display: "flex" }}>
                        {token.symbol}
                        <div>
                          <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">Price</div>
                        <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Pool</div>
                        <div>
                          <TooltipComponent
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return (
                                <>
                                  Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)}{" "}
                                  {token.symbol}
                                  <br />
                                  <br />
                                  Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                                </>
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Weight</div>
                        <div>{getWeightText(tokenInfo)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Utilization</div>
                        <div>{formatAmount(utilization, 2, 2, false)}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
