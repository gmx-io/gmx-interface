import { Trans } from "@lingui/macro";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import { Address, isAddress, isAddressEqual } from "viem";

import usePagination from "components/Referrals/usePagination";
import { getIcon } from "config/icons";
import { useMarketsInfoDataToIndexTokensStats } from "context/SyntheticsStateContext/hooks/statsHooks";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { IndexTokenStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatRatePercentage, formatUsd, formatUsdPrice } from "lib/numbers";

import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";
import PageTitle from "components/PageTitle/PageTitle";
import Pagination from "components/Pagination/Pagination";
import SearchInput from "components/SearchInput/SearchInput";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../OrderList/ExchangeTable";
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
  >();
  const [searchText, setSearchText] = useState("");

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const filteredMarkets = useFilterSortMarkets({ searchText, indexTokensStats, orderBy, direction });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredMarkets,
    10
  );

  return (
    <div
      className="my-15 rounded-4 bg-slate-800 text-left
                 max-[964px]:!-mr-[--default-container-padding] max-[964px]:!rounded-r-0
                 max-[600px]:!-mr-[--default-container-padding-mobile]"
    >
      <div className="flex items-center px-14 py-10 text-16">
        <Trans>GM Pools</Trans>
        <img className="ml-5 mr-10" src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
        <SearchInput
          size="s"
          value={searchText}
          setValue={handleSearch}
          className="*:!text-16"
          placeholder="Search Market"
          onKeyDown={noop}
          autoFocus={false}
        />
      </div>
      <div className="h-1 bg-slate-700"></div>
      <div className="overflow-x-auto">
        <table className="w-[max(100%,900px)]">
          <thead>
            <ExchangeTheadTr bordered={false}>
              <ExchangeTh>
                <Trans>MARKETS</Trans>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("price")}>
                  <Trans>PRICE</Trans>
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("tvl")}>
                  <Trans comment="Total Value Locked">TVL</Trans>
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("liquidity")}>
                  <Trans>LIQUIDITY</Trans>
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <TooltipWithPortal
                  handle={<Trans>NET RATE / 1 H</Trans>}
                  renderContent={renderNetFeeHeaderTooltipContent}
                />
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("utilization")}>
                  <Trans>UTILIZATION</Trans>
                </Sorter>
              </ExchangeTh>
            </ExchangeTheadTr>
          </thead>
          <tbody>
            {indexTokensStats.length > 0 &&
              currentData.length > 0 &&
              currentData.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)}

            {!indexTokensStats.length && <MarketListSkeleton />}
          </tbody>
        </table>
      </div>
      {indexTokensStats.length > 0 && !currentData.length && (
        <div className="p-14 text-center text-gray-400">
          <Trans>No markets found.</Trans>
        </div>
      )}
      {pageCount > 1 && (
        <>
          <div className="h-1 bg-slate-700"></div>
          <div className="py-10">
            <Pagination topMargin={false} page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
          </div>
        </>
      )}
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

    return indexTokensStats.filter((indexTokenStat) => {
      const token = indexTokenStat.token;

      const tokenSymbol = token.symbol;
      const tokenName = token.name;

      const tokenAddress = token.address;

      return (
        tokenSymbol.toLowerCase().includes(searchText.toLowerCase()) ||
        tokenName.toLowerCase().includes(searchText.toLowerCase()) ||
        (isAddress(searchText) && isAddressEqual(tokenAddress as Address, searchText))
      );
    });
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
    <ExchangeTr key={stats.token.symbol} bordered={false} hoverable={false}>
      <ExchangeTd>
        <div className="token-symbol-wrapper">
          <div className="flex items-center">
            <div className="App-card-title-info-icon min-h-40">
              <img
                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                alt={stats.token.symbol}
                width="40"
              />
            </div>
            <div>
              <div className="App-card-info-title">{marketIndexName}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} />
            </div>
          </div>
        </div>
      </ExchangeTd>
      <ExchangeTd>{formatUsdPrice(stats.token.prices?.minPrice)}</ExchangeTd>
      <ExchangeTd>
        <TooltipWithPortal
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
      </ExchangeTd>
      <ExchangeTd>
        <TooltipWithPortal
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
      </ExchangeTd>
      <ExchangeTd>
        <TooltipWithPortal
          tooltipClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          maxAllowedWidth={510}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </ExchangeTd>
      <ExchangeTd>{formatAmount(stats.totalUtilization, 2, 2)}%</ExchangeTd>
    </ExchangeTr>
  );
}
