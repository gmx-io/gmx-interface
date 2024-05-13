import { t, Trans } from "@lingui/macro";
import { useMedia } from "react-use";

import { getIcon } from "config/icons";
import { useMarketsInfoDataToIndexTokensStats } from "context/SyntheticsStateContext/hooks/statsHooks";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { IndexTokenStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatRatePercentage, formatUsd } from "lib/numbers";
import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";

import PageTitle from "components/PageTitle/PageTitle";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { NetFeeTooltip } from "./NetFeeTooltip";

import "./MarketsList.scss";

export function MarketsList() {
  const { chainId } = useChainId();

  const indexTokensStats = useMarketsInfoDataToIndexTokensStats();

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <>
      {!isMobile && <MarketsListDesktop chainId={chainId} indexTokensStats={indexTokensStats} />}
      {isMobile && <MarketsListMobile indexTokensStats={indexTokensStats} />}
    </>
  );
}

function MarketsListDesktop({ chainId, indexTokensStats }: { chainId: number; indexTokensStats: IndexTokenStat[] }) {
  return (
    <div className="token-table-wrapper App-card">
      <div className="App-card-title">
        <Trans>GM Pools</Trans> <img src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
      </div>
      <div className="App-card-divider"></div>
      <table className="token-table">
        <thead>
          <tr>
            <th>
              <Trans>MARKETS</Trans>
            </th>
            <th>
              <Trans>PRICE</Trans>
            </th>
            <th>
              <Trans comment="Total Value Locked">TVL</Trans>
            </th>
            <th>
              <Trans>LIQUIDITY</Trans>
            </th>
            <th>
              <Tooltip handle={<Trans>NET RATE / 1 H</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
            </th>
            <th>
              <Trans>UTILIZATION</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {indexTokensStats.length ? (
            indexTokensStats.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)
          ) : (
            <MarketListSkeleton />
          )}
        </tbody>
      </table>
    </div>
  );
}

function MarketsListMobile({ indexTokensStats }: { indexTokensStats: IndexTokenStat[] }) {
  return (
    <>
      <PageTitle title={t`GM Pools`} />
      <div className="token-grid">
        {indexTokensStats.map((stats, index) => {
          const tooltipPositionNetFee = index < indexTokensStats.length / 2 ? "bottom-end" : "top-end";
          const netFeePerHourLong = stats.bestNetFeeLong;
          const netFeePerHourShort = stats.bestNetFeeShort;

          return (
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
                    <AssetDropdown assetSymbol={stats.token.symbol} />
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
                    <Trans>TVL</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatUsd(stats.totalPoolValue)}
                      position="bottom-end"
                      className="MarketList-mobile-tvl-tooltip"
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={
                                <div className="inline-flex items-start">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>
                                </div>
                              }
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
                    <Trans>Liquidity</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatUsd(stats.totalMaxLiquidity)}
                      className="MarketList-mobile-tvl-tooltip"
                      renderContent={() => (
                        <>
                          {stats.marketsStats.map(({ marketInfo, maxLiquidity }) => (
                            <StatsTooltipRow
                              key={marketInfo.marketTokenAddress}
                              showDollar={false}
                              label={
                                <div className="inline-flex items-start">
                                  <span className="text-white">{getMarketIndexName(marketInfo)}</span>
                                  <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>
                                </div>
                              }
                              value={formatUsd(maxLiquidity)}
                            />
                          ))}
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Tooltip handle={<Trans>Net Rate / 1h</Trans>} renderContent={renderNetFeeHeaderTooltipContent} />
                  </div>
                  <div>
                    <TooltipWithPortal
                      portalClassName="MarketList-netfee-tooltip"
                      handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(
                        netFeePerHourShort
                      )}`}
                      position={tooltipPositionNetFee}
                      renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
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
          );
        })}
      </div>
    </>
  );
}

function MarketsListDesktopItem({ stats }: { stats: IndexTokenStat }) {
  const anyPool = stats.marketsStats[0];

  const netFeePerHourLong = stats.bestNetFeeLong;
  const netFeePerHourShort = stats.bestNetFeeShort;
  const marketIndexName = getMarketIndexName(anyPool.marketInfo);

  return (
    <tr key={stats.token.symbol}>
      <td>
        <div className="token-symbol-wrapper">
          <div className="flex items-center">
            <div className="App-card-title-info-icon">
              <img
                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                alt={stats.token.symbol}
                width="40"
              />
            </div>
            <div className="App-card-title-info-text">
              <div className="App-card-info-title">{marketIndexName}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} />
            </div>
          </div>
        </div>
      </td>
      <td>{formatUsd(stats.token.prices?.minPrice)}</td>
      <td>
        <Tooltip
          className="nowrap"
          handle={formatUsd(stats.totalPoolValue)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
                    </div>
                  }
                  value={formatUsd(poolValueUsd)}
                />
              ))}
            </>
          )}
        />
      </td>
      <td>
        <Tooltip
          className="nowrap"
          handle={formatUsd(stats.totalMaxLiquidity)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, maxLiquidity }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
                    </div>
                  }
                  value={formatUsd(maxLiquidity)}
                />
              ))}
            </>
          )}
        />
      </td>
      <td>
        <TooltipWithPortal
          portalClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          maxAllowedWidth={510}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </td>
      <td>{formatAmount(stats.totalUtilization, 2, 2)}%</td>
    </tr>
  );
}
