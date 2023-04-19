import { Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import { getToken } from "config/tokens";
import { getFundingFeeFactor } from "domain/synthetics/fees";
import { Market, getReservedUsd, useMarketsInfo } from "domain/synthetics/markets";
import { TokenData, getMidPrice } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, importImage } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";

import { useMemo } from "react";
import { useMedia } from "react-use";

function formatFundingRate(fundingRate?: BigNumber) {
  if (!fundingRate) {
    return "-";
  }

  const sign = fundingRate.isZero() ? "" : fundingRate.isNegative() ? "-" : "+";

  return `${sign}${formatAmount(fundingRate.mul(100).abs(), 30, 4)}%`;
}

export function MarketsList() {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfo(chainId);

  const isMobile = useMedia("(max-width: 1100px)");

  const indexTokensStats = useMemo(() => {
    const markets = Object.values(marketsInfoData || {});

    const indexMap: {
      [address: string]: {
        token: TokenData;
        price: BigNumber;
        totalPoolValue: BigNumber;
        minFundingRate: BigNumber;
        maxFundingRate: BigNumber;
        totalUtilization: BigNumber;
        totalReservedUsd: BigNumber;
        marketsStats: {
          market: Market;
          poolValueUsd: BigNumber;
          fundingRate: BigNumber;
          utilization: BigNumber;
        }[];
      };
    } = {};

    for (const market of markets) {
      if (!indexMap[market.indexTokenAddress]) {
        const token = market.indexToken;

        if (!token.prices) {
          continue;
        }

        const price = getMidPrice(token?.prices)!;

        indexMap[market.indexTokenAddress] = {
          token,
          price,
          totalPoolValue: BigNumber.from(0),
          minFundingRate: ethers.constants.MaxInt256,
          maxFundingRate: BigNumber.from(0),
          totalUtilization: BigNumber.from(0),
          totalReservedUsd: BigNumber.from(0),
          marketsStats: [],
        };
      }

      const indexTokenStats = indexMap[market.indexTokenAddress];

      const poolValueUsd = market.poolValueMax;

      const longReservedUsd = getReservedUsd(market, true);

      const shortReservedUsd = getReservedUsd(market, false);

      const totalReservedUsd = longReservedUsd?.add(shortReservedUsd || 0);

      const fundingRate = getFundingFeeFactor(market, true, 60 * 60) || BigNumber.from(0);

      if (fundingRate.gt(indexTokenStats.maxFundingRate)) {
        indexTokenStats.maxFundingRate = fundingRate;
      }

      if (fundingRate.lt(indexTokenStats.minFundingRate)) {
        indexTokenStats.minFundingRate = fundingRate;
      }

      const utilization =
        poolValueUsd?.gt(0) && totalReservedUsd
          ? totalReservedUsd.mul(BASIS_POINTS_DIVISOR).div(poolValueUsd || 0)
          : BigNumber.from(0);

      indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd || 0);

      indexTokenStats.totalReservedUsd = indexTokenStats.totalReservedUsd.add(totalReservedUsd || 0);
      indexTokenStats.marketsStats.push({
        market,
        utilization,
        fundingRate,
        poolValueUsd,
      });
    }

    for (const indexTokenStats of Object.values(indexMap)) {
      indexTokenStats.totalUtilization = indexTokenStats.totalPoolValue.gt(0)
        ? indexTokenStats.totalReservedUsd.mul(BASIS_POINTS_DIVISOR).div(indexTokenStats.totalPoolValue)
        : BigNumber.from(0);
    }

    return Object.values(indexMap);
  }, [marketsInfoData]);

  return (
    <>
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          <div className="App-card-title">
            <Trans>GM Index Composition</Trans> <img src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
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
                  <Trans>FUNDING RATE / 1h</Trans>
                </th>
                <th>
                  <Trans>UTILIZATION</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {indexTokensStats.map((stats) => (
                <tr key={stats.token.symbol}>
                  <td>
                    <div className="token-symbol-wrapper">
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <img
                            src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                            alt={stats.token.symbol}
                            width="40"
                          />
                        </div>
                        <div className="App-card-title-info-text">
                          <div className="App-card-title-info-text-name">{stats.token.name}</div>
                          <div className="App-card-title-info-text-address">{stats.token.symbol}</div>
                        </div>
                        <div>
                          <AssetDropdown assetSymbol={stats.token.symbol} assetInfo={stats.token} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatUsd(stats.token.prices?.minPrice)}</td>
                  <td>
                    <Tooltip
                      handle={formatUsd(stats.totalPoolValue)}
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ market, poolValueUsd }) => (
                            <StatsTooltipRow
                              key={market.marketTokenAddress}
                              showDollar={false}
                              label={`[${getToken(chainId, market.longTokenAddress)?.symbol}-${
                                getToken(chainId, market.shortTokenAddress)?.symbol
                              }]`}
                              value={formatUsd(poolValueUsd)}
                            />
                          ))}
                        </>
                      )}
                    />
                  </td>
                  <td>
                    <Tooltip
                      handle={`${formatFundingRate(stats.minFundingRate)} / ${formatFundingRate(stats.maxFundingRate)}`}
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ market, fundingRate }) => (
                            <StatsTooltipRow
                              key={market.marketTokenAddress}
                              showDollar={false}
                              label={`[${getToken(chainId, market.longTokenAddress)?.symbol}-${
                                getToken(chainId, market.shortTokenAddress)?.symbol
                              }]`}
                              value={`${formatFundingRate(fundingRate)}`}
                            />
                          ))}
                        </>
                      )}
                    />
                  </td>
                  <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && (
        <>
          <div className="App-card-title-small">
            <span>
              <Trans>GM Index Composition</Trans>
            </span>
            <img className="title-icon" src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
          </div>

          <div className="token-grid">
            {indexTokensStats.map((stats) => (
              <div className="App-card" key={stats.token.symbol}>
                <div className="App-card-title">
                  <div className="mobile-token-card">
                    <img
                      src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                      alt={stats.token.symbol}
                      width="20"
                    />
                    <div className="token-symbol-text">{stats.token.symbol}</div>
                    <div>
                      <AssetDropdown assetSymbol={stats.token.symbol} assetInfo={stats.token} />
                    </div>
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Price</Trans>
                    </div>
                    <div>{formatUsd(stats.token.prices?.minPrice)}</div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Pool</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatFundingRate(stats.minFundingRate)} / ${formatFundingRate(
                          stats.maxFundingRate
                        )}`}
                        renderContent={() => (
                          <>
                            {stats.marketsStats.map(({ market, fundingRate }) => (
                              <StatsTooltipRow
                                key={market.marketTokenAddress}
                                showDollar={false}
                                label={`[${getToken(chainId, market.longTokenAddress)?.symbol}-${
                                  getToken(chainId, market.shortTokenAddress)?.symbol
                                }]`}
                                value={`${formatFundingRate(fundingRate)}`}
                              />
                            ))}
                          </>
                        )}
                      />
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Funding Rate / 1h</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatAmount(stats.minFundingRate.mul(100), 30, 4)}% / ${formatAmount(
                          stats.maxFundingRate.mul(100),
                          30,
                          4
                        )}`}
                        renderContent={() => (
                          <>
                            {stats.marketsStats.map(({ market, poolValueUsd }) => (
                              <StatsTooltipRow
                                key={market.marketTokenAddress}
                                showDollar={false}
                                label={`[${getToken(chainId, market.longTokenAddress)?.symbol}-${
                                  getToken(chainId, market.shortTokenAddress)?.symbol
                                }]`}
                                value={`${formatAmount(stats.minFundingRate.mul(100), 30, 4)}%`}
                              />
                            ))}
                          </>
                        )}
                      />
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Utilization</Trans>
                    </div>
                    <div>{formatAmount(stats.totalUtilization, 2, 2, false)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
