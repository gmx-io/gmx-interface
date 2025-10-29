import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { useMarketsInfoDataToIndexTokensStats } from "context/SyntheticsStateContext/hooks/statsHooks";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { IndexTokenStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatAmountHuman, formatRatePercentage, formatUsdPrice } from "lib/numbers";
import { searchBy } from "lib/searchBy";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";
import { NetFeeTooltip } from "./NetFeeTooltip";

import "./MarketsList.scss";

export function MarketsList() {
  const { chainId } = useChainId();

  const indexTokensStats = useMarketsInfoDataToIndexTokensStats();

  return (
    <>
      <MarketsListDesktop chainId={chainId} indexTokensStats={indexTokensStats} />
    </>
  );
}

function MarketsListDesktop({ chainId, indexTokensStats }: { chainId: number; indexTokensStats: IndexTokenStat[] }) {
  const { orderBy, direction, getSorterProps } = useSorterHandlers<
    "price" | "tvl" | "liquidity" | "utilization" | "unspecified"
  >("dashboard-markets-list");
  const [searchText, setSearchText] = useState("");

  const filteredMarkets = useFilterSortMarkets({ searchText, indexTokensStats, orderBy, direction });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredMarkets,
    DEFAULT_PAGE_SIZE
  );

  return (
    <div className="my-15 rounded-4 bg-slate-900 text-left">
      <div className="flex flex-col gap-16 p-20 text-16">
        <span className="text-h2">
          <Trans>GM Pools</Trans>
        </span>

        <div className="max-w-[260px]">
          <SearchInput
            size="s"
            value={searchText}
            setValue={setSearchText}
            className="*:!text-body-medium"
            placeholder={t`Search Market`}
            autoFocus={false}
          />
        </div>
      </div>
      <TableScrollFadeContainer>
        <table className="w-[max(100%,900px)]">
          <thead>
            <TableTheadTr>
              <TableTh>
                <Trans>MARKETS</Trans>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("price")}>
                  <Trans>PRICE</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("tvl")}>
                  <Trans comment="Total Value Locked">TVL</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("liquidity")}>
                  <Trans>LIQUIDITY</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  handle={<Trans>NET RATE / 1 H</Trans>}
                  renderContent={renderNetFeeHeaderTooltipContent}
                />
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("utilization")}>
                  <Trans>UTILIZATION</Trans>
                </Sorter>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {indexTokensStats.length > 0 &&
              currentData.length > 0 &&
              currentData.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)}

            {indexTokensStats.length > 0 && !currentData.length && (
              <TableTr className="h-[64.5px]">
                <TableTd colSpan={6} className="text-body-medium align-top text-typography-secondary">
                  <Trans>No markets found.</Trans>
                </TableTd>
              </TableTr>
            )}

            {indexTokensStats.length > 0 && currentData.length < DEFAULT_PAGE_SIZE && (
              <MarketListSkeleton
                invisible
                count={currentData.length === 0 ? DEFAULT_PAGE_SIZE - 1 : DEFAULT_PAGE_SIZE - currentData.length}
              />
            )}
            {!indexTokensStats.length && <MarketListSkeleton />}
          </tbody>
        </table>
      </TableScrollFadeContainer>
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}

function useFilterSortMarkets({
  indexTokensStats,
  searchText,
  orderBy,
  direction,
}: {
  indexTokensStats: IndexTokenStat[];
  searchText: string;
  orderBy: string;
  direction: string;
}) {
  const filteredMarkets = useMemo(() => {
    if (!searchText.trim()) {
      return indexTokensStats;
    }

    return searchBy(
      indexTokensStats,
      [
        (item) => stripBlacklistedWords(item.token.name),
        (item) => `${getTokenVisualMultiplier(item.token)}${item.token.symbol}`,
        (item) => item.token.address,
      ],
      searchText
    );
  }, [indexTokensStats, searchText]);

  const sortedMarkets = useMemo(() => {
    if (orderBy === "unspecified" || direction === "unspecified") {
      return filteredMarkets;
    }

    return filteredMarkets.slice().sort((a, b) => {
      const directionMultiplier = direction === "asc" ? 1 : -1;

      if (orderBy === "price") {
        return a.token.prices?.minPrice > b.token.prices?.minPrice ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "tvl") {
        return a.totalPoolValue > b.totalPoolValue ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "liquidity") {
        return a.totalMaxLiquidity > b.totalMaxLiquidity ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "utilization") {
        return a.totalUtilization > b.totalUtilization ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [filteredMarkets, orderBy, direction]);

  return sortedMarkets;
}

function MarketsListDesktopItem({ stats }: { stats: IndexTokenStat }) {
  const anyPool = stats.marketsStats[0];

  const netFeePerHourLong = stats.bestNetFeeLong;
  const netFeePerHourShort = stats.bestNetFeeShort;
  const marketIndexName = getMarketIndexName(anyPool.marketInfo);

  return (
    <TableTr key={stats.token.symbol}>
      <TableTd>
        <div className="token-symbol-wrapper">
          <div className="flex items-center">
            <div className="App-card-title-info-icon min-h-40">
              <img
                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + ".svg")}
                alt={stats.token.symbol}
                width="40"
              />
            </div>
            <div>
              <div className="text-body-large font-medium">{marketIndexName}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} marketsStats={stats.marketsStats} />
            </div>
          </div>
        </div>
      </TableTd>
      <TableTd className="numbers">
        {formatUsdPrice(stats.token.prices?.minPrice, {
          visualMultiplier: stats.token.visualMultiplier,
        })}
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          className="nowrap"
          handle={formatAmountHuman(stats.totalPoolValue, USD_DECIMALS, true, 2)}
          handleClassName="numbers"
          content={
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
                  value={formatAmountHuman(poolValueUsd, USD_DECIMALS, true, 2)}
                  valueClassName="numbers"
                />
              ))}
            </>
          }
        />
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          className="nowrap"
          handle={formatAmountHuman(stats.totalMaxLiquidity, USD_DECIMALS, true, 2)}
          handleClassName="numbers"
          content={
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
                  value={formatAmountHuman(maxLiquidity, USD_DECIMALS, true, 2)}
                  valueClassName="numbers"
                />
              ))}
            </>
          }
        />
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          tooltipClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          handleClassName="numbers"
          maxAllowedWidth={510}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </TableTd>
      <TableTd className="numbers">{formatAmount(stats.totalUtilization, 2, 2)}%</TableTd>
    </TableTr>
  );
}
