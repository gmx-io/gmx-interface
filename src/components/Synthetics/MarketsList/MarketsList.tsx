import { Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import { getToken } from "config/tokens";
import { getFundingFeeFactor } from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import {
  Market,
  getPoolValue,
  getReservedUsd,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
import { TokenData, getMidPrice, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, importImage } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { useMemo } from "react";
import { useMedia } from "react-use";

export function MarketsList() {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);

  const isMobile = useMedia("(max-width: 1200px)");

  const indexTokensStats = useMemo(() => {
    const markets = Object.values(marketsData);
    const indexMap: {
      [address: string]: {
        token: TokenData;
        price: BigNumber;
        totalPoolValue: BigNumber;
        totalFundingRate: BigNumber;
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
        const token = getTokenData(tokensData, market.indexTokenAddress)!;

        if (!token.prices) continue;

        const price = getMidPrice(token?.prices)!;

        indexMap[market.indexTokenAddress] = {
          token,
          price,
          totalPoolValue: BigNumber.from(0),
          totalFundingRate: BigNumber.from(0),
          totalUtilization: BigNumber.from(0),
          totalReservedUsd: BigNumber.from(0),
          marketsStats: [],
        };
      }

      const indexTokenStats = indexMap[market.indexTokenAddress];

      const poolValueUsd =
        getPoolValue(marketsData, openInterestData, poolsData, tokensData, market.marketTokenAddress, true) ||
        BigNumber.from(0);

      const longReservedUsd = getReservedUsd(
        marketsData,
        openInterestData,
        tokensData,
        market.marketTokenAddress,
        true
      );

      const shortReservedUsd = getReservedUsd(
        marketsData,
        openInterestData,
        tokensData,
        market.marketTokenAddress,
        false
      );

      const totalReservedUsd = longReservedUsd?.add(shortReservedUsd || 0);

      const fundingRate =
        getFundingFeeFactor(marketsFeesConfigs, market.marketTokenAddress, true, 60 * 60)?.abs() || BigNumber.from(0);

      const utilization =
        poolValueUsd?.gt(0) && totalReservedUsd
          ? totalReservedUsd.mul(BASIS_POINTS_DIVISOR).div(poolValueUsd || 0)
          : BigNumber.from(0);

      indexTokenStats.totalPoolValue = indexTokenStats.totalPoolValue.add(poolValueUsd || 0);
      indexTokenStats.totalFundingRate = indexTokenStats.totalFundingRate.add(fundingRate || 0);
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
  }, [marketsData, marketsFeesConfigs, openInterestData, poolsData, tokensData]);

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
                  <td>{formatAmount(stats.totalFundingRate.mul(100), 30, 4)}%</td>
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
                        handle={formatUsd(stats.totalPoolValue)}
                        position="right-bottom"
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
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Funding Rate / 1h</Trans>
                    </div>
                    <div>{formatAmount(stats.totalFundingRate.mul(100), 30, 4)}%</div>
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
