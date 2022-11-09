import React, { useEffect } from "react";
import useSWR from "swr";
import { useWeb3React } from "@web3-react/core";

import cx from "classnames";
import { getContract, XGMT_EXCLUDED_ACCOUNTS } from "config/contracts";

import Footer from "components/Footer/Footer";

import Reader from "abis/Reader.json";
import YieldToken from "abis/YieldToken.json";

import "./Dashboard.css";

import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import metamaskImg from "img/metamask.png";
import coingeckoImg from "img/coingecko.png";
import bscscanImg from "img/bscscan.png";
import { getServerUrl } from "config/backend";
import { contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { getTokenUrl } from "domain/tokens/utils";
import { bigNumberify, expandDecimals, formatAmount, numberWithCommas } from "lib/numbers";
import { getToken, getTokens } from "config/tokens";
import { useChainId } from "lib/chains";
import { formatDate } from "lib/dates";

const USD_DECIMALS = 30;
const PRECISION = expandDecimals(1, 30);
const BASIS_POINTS_DIVISOR = 10000;

function getInfoTokens(chainId, stableTokens, tokenSymbols, tokens) {
  if (!tokens) {
    return;
  }

  const tokenMap = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i].data));
    const tokenInfo = getToken(chainId, token.address);
    const availableUsd = stableTokens[token.symbol]
      ? bigNumberify(token.poolAmount).mul(token.minPrice).div(expandDecimals(1, token.decimals))
      : bigNumberify(token.availableAmount).mul(token.minPrice).div(expandDecimals(1, token.decimals));
    token.availableUsd = availableUsd;
    token.managedUsd = availableUsd.add(token.guaranteedUsd);
    token.managedAmount = token.managedUsd.mul(expandDecimals(1, token.decimals)).div(token.minPrice);
    token.utilization = bigNumberify(token.poolAmount).eq(0)
      ? bigNumberify(0)
      : bigNumberify(token.reservedAmount).mul(BASIS_POINTS_DIVISOR).div(token.poolAmount);
    token.utilizationUsd = stableTokens[token.symbol]
      ? bigNumberify(token.reservedAmount).mul(PRECISION).div(expandDecimals(1, 18))
      : bigNumberify(token.guaranteedUsd);
    token.info = tokenInfo;
    tokenMap[token.symbol] = token;
  }

  const info = [];
  for (let i = 0; i < tokenSymbols.length; i++) {
    const symbol = tokenSymbols[i];
    if (!tokenMap[symbol]) {
      continue;
    }
    info.push(tokenMap[symbol]);
  }

  return { infoTokens: info, tokenMap };
}

function getTokenStats(tokens, stableTokens) {
  if (!tokens) {
    return {};
  }

  const stats = {
    aum: bigNumberify(0),
    usdg: bigNumberify(0),
    longUtilizationUsd: bigNumberify(0),
    shortUtilizationUsd: bigNumberify(0),
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    stats.aum = stats.aum.add(token.managedUsd);
    stats.usdg = stats.usdg.add(token.usdgAmount);
    if (stableTokens[token.symbol]) {
      stats.shortUtilizationUsd = stats.shortUtilizationUsd.add(token.utilizationUsd);
    } else {
      stats.longUtilizationUsd = stats.longUtilizationUsd.add(token.utilizationUsd);
    }
  }

  return stats;
}

function getVolumeInfo(dailyVolume) {
  if (!dailyVolume || dailyVolume.length === 0) {
    return {};
  }

  const timestamp = dailyVolume[0].data.timestamp;

  const info = {};
  let totalVolume = bigNumberify(0);
  for (let i = 0; i < dailyVolume.length; i++) {
    const item = dailyVolume[i].data;
    if (item.timestamp !== timestamp) {
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

function getDailyVolumes(dailyVolume) {
  if (!dailyVolume || dailyVolume.length === 0) {
    return {};
  }

  let volumes = [];

  let info;
  for (let i = 0; i < dailyVolume.length; i++) {
    const item = dailyVolume[i].data;
    if (!info || item.timestamp !== info.timestamp) {
      if (info) {
        volumes.push(info);
      }

      info = {
        timestamp: item.timestamp,
        volume: bigNumberify(0),
      };
    }

    info.volume = info.volume.add(item.volume);
  }

  if (info.volume.gt(0)) {
    volumes.push(info);
  }

  let weeklyTotalVolume = bigNumberify(0);
  for (let i = 0; i < volumes.length; i++) {
    weeklyTotalVolume = weeklyTotalVolume.add(volumes[i].volume);
  }

  volumes = volumes.slice(0, 7);

  return { volumes, weeklyTotalVolume };
}

function getTotalVolume(volumes) {
  if (!volumes || volumes.length === 0) {
    return;
  }

  let volume = bigNumberify(0);
  for (let i = 0; i < volumes.length; i++) {
    volume = volume.add(volumes[i].data.volume);
  }

  return volume;
}

function getVolumeSummary(chainId, volumes) {
  if (!volumes || volumes.length === 0) {
    return {};
  }

  const info = {};
  for (let i = 0; i < volumes.length; i++) {
    const { action, token, volume } = volumes[i].data;
    const tokenInfo = getToken(chainId, token);
    if (!tokenInfo) {
      continue;
    }
    if (!info[action]) {
      info[action] = {};
    }
    if (!info[action][token]) {
      info[action][token] = {
        symbol: tokenInfo.symbol,
        action: action,
        volume: bigNumberify(0),
      };
    }
    info[action][token].volume = info[action][token].volume.add(volume);
  }

  return info;
}

function printVolumeSummary(summary) {
  const lines = [];
  for (const [action, item0] of Object.entries(summary)) {
    lines.push("\n" + action);
    // eslint-disable-next-line
    for (const [address, item1] of Object.entries(item0)) {
      if (item1.volume.eq(0)) {
        continue;
      }
      lines.push(`${item1.symbol}: ${formatAmount(item1.volume, USD_DECIMALS, 0, true)} USD`);
    }
  }
  // eslint-disable-next-line no-console
  console.info(lines.join("\n"));
}

function getFeeData(fees, tokenSymbols) {
  if (!fees) {
    return;
  }

  const data = [];
  for (let i = 0; i < tokenSymbols.length; i++) {
    const symbol = tokenSymbols[i];
    const fee = fees[i];
    data.push({ symbol, fee });
  }

  return data;
}

export default function DashboardV1() {
  const { chainId } = useChainId();
  const { library } = useWeb3React();

  const positionStatsUrl = getServerUrl(chainId, "/position_stats");
  const { data: positionStats, mutate: updatePositionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const tokensUrl = getServerUrl(chainId, "/tokens");
  const { data: tokens, mutate: updateTokens } = useSWR([tokensUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const dailyVolumeUrl = getServerUrl(chainId, "/daily_volume");
  const { data: dailyVolume, mutate: updateDailyVolume } = useSWR([dailyVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume");
  const { data: totalVolume, mutate: updateTotalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const tokensStaticData = getTokens(chainId);
  const stableTokens = {};
  const tokenSymbols = [];
  tokensStaticData.forEach((token) => {
    if (token.isStable) {
      stableTokens[token.symbol] = true;
    }
    tokenSymbols.push(token.symbol);
  });

  const feeHistory = [];
  let totalFeesDistributed = 0;
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd);
  }
  const infoTokensData = getInfoTokens(chainId, stableTokens, tokenSymbols, tokens);
  let infoTokens;
  let tokenMap;
  if (infoTokensData) {
    infoTokens = infoTokensData.infoTokens;
    tokenMap = infoTokensData.tokenMap;
  }

  const tokenStats = getTokenStats(infoTokens, stableTokens);
  const volumeInfo = getVolumeInfo(dailyVolume);
  const { volumes: dailyVolumes } = getDailyVolumes(dailyVolume);
  const totalVolumeSum = getTotalVolume(totalVolume);

  const whitelistedTokens = tokensStaticData.map((token) => token.address);

  const gmtSupply = bigNumberify("1000000000000000000000000").sub(bigNumberify("598530625016359222222472"));

  const readerAddress = getContract(chainId, "Reader");
  const ammFactoryAddressV2 = getContract(chainId, "AmmFactoryV2");
  const gmtAddress = getContract(chainId, "GMT");
  const xgmtAddress = getContract(chainId, "XGMT");
  const vaultAddress = getContract(chainId, "Vault");
  const usdgAddress = getContract(chainId, "USDG");
  const showUsdgAmount = true;

  const { data: pairInfo, mutate: updatePairInfo } = useSWR(
    [false, chainId, readerAddress, "getPairInfo", ammFactoryAddressV2],
    {
      fetcher: contractFetcher(library, Reader, [[gmtAddress, usdgAddress, xgmtAddress, usdgAddress]]),
    }
  );

  const { data: usdgSupply, mutate: updateUsdgSupply } = useSWR(
    ["Dashboard:usdgSupply", chainId, usdgAddress, "totalSupply"],
    {
      fetcher: contractFetcher(library, YieldToken),
    }
  );

  const { data: xgmtSupply, mutate: updateXgmtSupply } = useSWR(
    ["Dashboard:xgmtSupply", chainId, readerAddress, "getTokenSupply", xgmtAddress],
    {
      fetcher: contractFetcher(library, Reader, [XGMT_EXCLUDED_ACCOUNTS]),
    }
  );

  const { data: fees, mutate: updateFees } = useSWR(
    ["Dashboard:fees", chainId, readerAddress, "getFees", vaultAddress],
    {
      fetcher: contractFetcher(library, Reader, [whitelistedTokens]),
    }
  );

  const feeData = getFeeData(fees, tokenSymbols);

  useEffect(() => {
    const interval = setInterval(() => {
      updatePositionStats(undefined, true);
      updateTokens(undefined, true);
      updateDailyVolume(undefined, true);
      updateTotalVolume(undefined, true);
      updatePairInfo(undefined, true);
      updateUsdgSupply(undefined, true);
      updateXgmtSupply(undefined, true);
      updateFees(undefined, true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [
    updatePositionStats,
    updateTokens,
    updateDailyVolume,
    updateTotalVolume,
    updatePairInfo,
    updateUsdgSupply,
    updateXgmtSupply,
    updateFees,
  ]);

  let gmtPairInfo;
  let xgmtPairInfo;
  if (pairInfo && pairInfo.length === 4) {
    gmtPairInfo = [pairInfo[0], pairInfo[1]];
    xgmtPairInfo = [pairInfo[2], pairInfo[3]];
  }

  let gmtPrice;
  let gmtMarketCap;
  if (gmtPairInfo && gmtSupply && gmtPairInfo[1] && gmtPairInfo[0] && gmtPairInfo[0].gt(0)) {
    gmtPrice = gmtPairInfo[1].mul(PRECISION).div(gmtPairInfo[0]);
    gmtMarketCap = gmtSupply.mul(gmtPrice).div(expandDecimals(1, 18));
  }

  let xgmtPrice;
  let xgmtMarketCap;
  if (xgmtPairInfo && xgmtSupply && xgmtPairInfo[1] && xgmtPairInfo[0] && xgmtPairInfo[0].gt(0)) {
    xgmtPrice = xgmtPairInfo[1].mul(PRECISION).div(xgmtPairInfo[0]);
    xgmtMarketCap = xgmtSupply.mul(xgmtPrice).div(expandDecimals(1, 18));
  }

  let feeText;
  let totalFeesUsd = bigNumberify(0);
  if (feeData && feeData.length > 0) {
    feeText = feeData.map((item) => `${formatAmount(item.fee, 18, 4, true)} ${item.symbol}`).join(", ");

    for (let i = 0; i < feeData.length; i++) {
      const item = feeData[i];
      const info = tokenMap ? tokenMap[item.symbol] : undefined;
      if (!info) {
        continue;
      }
      const feeUsd = item.fee.mul(info.minPrice).div(expandDecimals(1, 18));
      totalFeesUsd = totalFeesUsd.add(feeUsd);
    }
  }

  let totalLongPositionSizes;
  let totalShortPositionSizes;
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes);
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes);
  }

  const hourValue = parseInt((new Date() - new Date().setUTCHours(0, 0, 0, 0)) / (60 * 60 * 1000));
  const minuteValue = parseInt((new Date() - new Date().setUTCHours(0, 0, 0, 0)) / (60 * 1000));
  let volumeLabel = hourValue > 0 ? `${hourValue}h` : `${minuteValue}m`;

  const shouldPrintExtraInfo = false;
  if (shouldPrintExtraInfo) {
    const volumeSummary = getVolumeSummary(totalVolume);
    printVolumeSummary(volumeSummary);
  }

  const addToken = async (token) => {
    if (!window.ethereum) {
      helperToast.error(t`Could not add token to MetaMask`);
      return;
    }

    try {
      // wasAdded is a boolean. Like any RPC method, an error may be thrown.
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20", // Initially only supports ERC20, but eventually more!
          options: {
            address: token.address, // The address that the token is at.
            symbol: token.symbol, // A ticker symbol or shorthand, up to 5 chars.
            decimals: token.info.decimals, // The number of decimals in the token
            image: token.info.imageUrl, // A string url of the token logo
          },
        },
      });
    } catch (error) {
      helperToast.error(t`Could not add token to MetaMask`);
    }
  };

  return (
    <div className="Dashboard Page page-layout">
      <div className="Dashboard-title App-hero">
        <div className="Dashboard-title-primary App-hero-primary">
          ${formatAmount(tokenStats.aum, USD_DECIMALS, 0, true)}
        </div>
        <div className="Dashboard-title-secondary">
          <Trans>Assets Under Management</Trans>
        </div>
      </div>
      {feeText && (
        <div className="Dashboard-fee-info">
          <Trans>
            Total fees earned since {formatDate(feeHistory[0].to)}: {formatAmount(totalFeesUsd, USD_DECIMALS, 2, true)}{" "}
            USD
            <br />
            Fee assets: {feeText}
          </Trans>
        </div>
      )}
      <div className="Dashboard-note">
        <Trans>
          Long positions: {formatAmount(totalLongPositionSizes, USD_DECIMALS, 2, true)} USD, Short positions:{" "}
          {formatAmount(totalShortPositionSizes, USD_DECIMALS, 2, true)} USD,&nbsp;
          {volumeLabel} volume: {formatAmount(volumeInfo.totalVolume, USD_DECIMALS, 2, true)} USD
        </Trans>
      </div>
      <div className="Dashboard-token-list-container">
        <div className="Dashboard-token-list Dashboard-list">
          <div className="Dashboard-token-card usdg App-card primary">
            <div className="Dashboard-token-title App-card-title">
              <div className="Dashboard-token-title-text">USDG</div>
              <div className="Dashboard-token-title-options">
                <img
                  src={metamaskImg}
                  alt="MetaMask"
                  onClick={() =>
                    addToken({
                      address: "0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7",
                      symbol: "USDG",
                      info: {
                        decimals: 18,
                        imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
                      },
                    })
                  }
                />
                <ExternalLink href="https://www.coingecko.com/en/coins/usd-gambit">
                  <img src={coingeckoImg} alt="CoinGecko" />
                </ExternalLink>
                <ExternalLink href="https://bscscan.com/token/0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7">
                  <img src={bscscanImg} alt="BscScan" />
                </ExternalLink>
              </div>
            </div>
            <div className="Dashboard-token-card-bottom App-card-content">
              <div className="Dashboard-token-info App-card-row">
                <div className="label">
                  <Trans>Supply</Trans>
                </div>
                <div>{formatAmount(usdgSupply, 18, 0, true)} USDG</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>1.00 USD</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Market Cap</Trans>
                </div>
                <div>{formatAmount(usdgSupply, 18, 0, true)} USD</div>
              </div>
            </div>
          </div>
          <div className="Dashboard-token-card App-card">
            <div className="Dashboard-token-title App-card-title">
              <div className="Dashboard-token-title-text">GMT</div>
              <div className="Dashboard-token-title-options">
                <img
                  src={metamaskImg}
                  alt="MetaMask"
                  onClick={() =>
                    addToken({
                      address: "0x99e92123eB77Bc8f999316f622e5222498438784",
                      symbol: "GMT",
                      info: {
                        decimals: 18,
                        imageUrl: "https://assets.coingecko.com/coins/images/14270/small/gambit_logo.png",
                      },
                    })
                  }
                />
                <ExternalLink href="https://www.coingecko.com/en/coins/gambit">
                  <img src={coingeckoImg} alt="CoinGecko" />
                </ExternalLink>
                <ExternalLink href="https://bscscan.com/token/0x99e92123eB77Bc8f999316f622e5222498438784">
                  <img src={bscscanImg} alt="BscScan" />
                </ExternalLink>
              </div>
            </div>
            <div className="Dashboard-token-card-bottom App-card-content">
              <div className="Dashboard-token-info App-card-row">
                <div className="label">
                  <Trans>Supply</Trans>
                </div>
                <div>{formatAmount(gmtSupply, 18, 0, true)} GMT</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>{formatAmount(gmtPrice, USD_DECIMALS, 2, true)} USD</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Market Cap</Trans>
                </div>
                <div>{formatAmount(gmtMarketCap, USD_DECIMALS, 0, true)} USD</div>
              </div>
            </div>
          </div>
          <div className="Dashboard-token-card App-card">
            <div className="Dashboard-token-title App-card-title">
              <div className="Dashboard-token-title-text">xGMT</div>
              <div className="Dashboard-token-title-options">
                <img
                  src={metamaskImg}
                  alt="MetaMask"
                  onClick={() =>
                    addToken({
                      address: "0xe304ff0983922787Fd84BC9170CD21bF78B16B10",
                      symbol: "xGMT",
                      info: {
                        decimals: 18,
                        imageUrl:
                          "https://assets.coingecko.com/coins/images/15888/small/xgambit-transparent-yellow.png",
                      },
                    })
                  }
                />
                <ExternalLink href="https://www.coingecko.com/en/coins/xgambit">
                  <img src={coingeckoImg} alt="CoinGecko" />
                </ExternalLink>
                <ExternalLink href="https://bscscan.com/token/0xe304ff0983922787Fd84BC9170CD21bF78B16B10">
                  <img src={bscscanImg} alt="BscScan" />
                </ExternalLink>
              </div>
            </div>
            <div className="Dashboard-token-card-bottom App-card-content">
              <div className="Dashboard-token-info App-card-row">
                <div className="label">
                  <Trans>Supply</Trans>
                </div>
                <div>{formatAmount(xgmtSupply, 18, 0, true)} xGMT</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>{formatAmount(xgmtPrice, USD_DECIMALS, 2, true)} USD</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Market Cap</Trans>
                </div>
                <div>{formatAmount(xgmtMarketCap, USD_DECIMALS, 0, true)} USD</div>
              </div>
            </div>
          </div>
          {infoTokens &&
            infoTokens.map((token) => (
              <div className="Dashboard-token-card App-card" key={token.address}>
                <div className="Dashboard-token-title App-card-title">
                  <div className="Dashboard-token-title-text">{token.symbol}</div>
                  <div className="Dashboard-token-title-options">
                    <img src={metamaskImg} alt="MetaMask" onClick={() => addToken(token)} />
                    <ExternalLink href={token.info.coingeckoUrl}>
                      <img src={coingeckoImg} alt="CoinGecko" />
                    </ExternalLink>
                    <ExternalLink href={getTokenUrl(chainId, token.address)}>
                      <img src={bscscanImg} alt="BscScan" />
                    </ExternalLink>
                  </div>
                </div>
                <div className="Dashboard-token-card-bottom App-card-content">
                  <div className="Dashboard-token-info App-card-row">
                    <div className="label">
                      <Trans>Pool</Trans>
                    </div>
                    <div>
                      {formatAmount(token.managedAmount, token.decimals, 0, true)} {token.symbol} ($
                      {formatAmount(token.managedUsd, USD_DECIMALS, 0, true)})
                    </div>
                  </div>
                  {showUsdgAmount && (
                    <div className="Dashboard-token-info App-card-row">
                      <div className="label">
                        <Trans>USDG Debt</Trans>
                      </div>
                      <div>{formatAmount(token.usdgAmount, 18, 0, true)} USD</div>
                    </div>
                  )}
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>{volumeLabel} Volume</Trans>
                    </div>
                    <div>{formatAmount(volumeInfo[token.address] || bigNumberify(0), USD_DECIMALS, 2, true)} USD</div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Utilization</Trans>
                    </div>
                    <div>{formatAmount(token.utilization, 2, 2, true)}%</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      {dailyVolumes && dailyVolumes.length > 0 && (
        <div>
          <div className="App-hero">
            <div className="Dashboard-volumes-header App-hero-primary">
              ${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}
            </div>
            <div className="Dashboard-title-secondary">
              <Trans>Total Volume Since 28 April 2021</Trans>
            </div>
          </div>
          <div className="Dashboard-volume-list Dashboard-list">
            {dailyVolumes.map((volume, index) => (
              <div className={cx("App-card", { primary: index === 0 })} key={volume.timestamp}>
                <div className={cx("Dashboard-token-title", "App-card-title")}>{formatDate(volume.timestamp)}</div>
                <div className="Dashboard-token-card-bottom App-card-content">
                  <div className="Dashboard-token-info App-card-row">
                    <div className="label">
                      <Trans>Volume</Trans>
                    </div>
                    <div>{formatAmount(volume.volume, USD_DECIMALS, 2, true)} USD</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="Dashboard-fees">
        <div className="App-hero">
          <div className="Dashboard-fees-header App-hero-primary">
            ${numberWithCommas(totalFeesDistributed.toFixed(0))}
          </div>
          <div className="Dashboard-title-secondary">
            <Trans>Total Fees Distributed</Trans>
          </div>
        </div>
        <div className="Dashboard-list Dashboard-fees-list">
          {feeHistory.map((feeItem, index) => (
            <div className={cx("App-card", { primary: index === 0 })} key={index}>
              <div className={cx("Dashboard-token-title", "App-card-title")}>
                {formatDate(feeItem.from)} - {formatDate(feeItem.to)}
              </div>
              <div className="Dashboard-token-card-bottom App-card-content">
                <div className="Dashboard-token-info App-card-row">
                  <div className="label">
                    <Trans>Fees</Trans>
                  </div>
                  <div>{numberWithCommas(parseFloat(feeItem.feeUsd))} USD</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
