import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTokensFavorites } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketTokensAPRData, getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { PerformanceSnapshotsData } from "domain/synthetics/markets/useGmGlvPerformance";
import { PerformanceData } from "domain/synthetics/markets/useGmGlvPerformance";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import Loader from "components/Common/Loader";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import Pagination from "components/Pagination/Pagination";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer, TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ApyTooltipContent } from "./ApyTooltipContent";
import { GmListItem } from "./GmListItem";
import { GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";
import { useFilterSortPools } from "./useFilterSortPools";

export type Props = {
  glvTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  glvTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvPerformance: PerformanceData | undefined;
  gmPerformance: PerformanceData | undefined;
  glvPerformanceSnapshots: PerformanceSnapshotsData | undefined;
  gmPerformanceSnapshots: PerformanceSnapshotsData | undefined;
  isDeposit: boolean;
};

export type SortField = "price" | "totalSupply" | "wallet" | "apy" | "performance" | "unspecified";

export function GmList({
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  isDeposit,
  glvPerformance,
  gmPerformance,
  glvPerformanceSnapshots,
  gmPerformanceSnapshots,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectMarketsInfoData);

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit, withGlv: false });
  const { isConnected: active } = useAccount();
  const userEarnings = useUserEarnings(chainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("gm-list");
  const [searchText, setSearchText] = useState("");
  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites("gm-list");

  const isLoading = !marketsInfo || !marketTokensData;

  const filteredGmTokens = useFilterSortPools({
    marketsInfo,
    marketTokensData,
    orderBy,
    direction,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    searchText,
    tab,
    favoriteTokens,
    gmPerformance,
  });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredGmTokens,
    DEFAULT_PAGE_SIZE
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const rows =
    currentData.length > 0 &&
    currentData.map((token) => (
      <GmListItem
        key={token.address}
        token={token}
        marketsTokensApyData={marketsTokensApyData}
        glvTokensIncentiveAprData={undefined}
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        marketsTokensLidoAprData={marketsTokensLidoAprData}
        glvTokensApyData={undefined}
        glvPerformance={glvPerformance}
        gmPerformance={gmPerformance}
        glvPerformanceSnapshots={glvPerformanceSnapshots}
        gmPerformanceSnapshots={gmPerformanceSnapshots}
        isFavorite={favoriteTokens.includes(token.address)}
        onFavoriteClick={toggleFavoriteToken}
      />
    ));

  const isMobile = usePoolsIsMobilePage();

  return (
    <PoolsCard
      title={t`GM Pools`}
      description={t`Pools providing liquidity to specific GMX markets, supporting single-asset and native asset options.`}
      bottom={
        pageCount > 1 ? (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} topMargin={false} />
        ) : undefined
      }
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-8 py-8">
          <SearchInput
            size="s"
            className="*:!text-body-medium"
            value={searchText}
            setValue={setSearchText}
            placeholder="Search Pools"
            autoFocus={false}
            variant="secondary"
          />
          <div className="max-w-full">
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs
                favoritesKey="gm-list"
                className="!text-slate-100 hover:!text-white"
                activeClassName="!text-white"
              />
            </ButtonRowScrollFadeContainer>
          </div>
        </div>
        {isMobile ? (
          <div className="flex flex-col gap-4">
            {rows}
            {!currentData.length && !isLoading && (
              <div className="text-body-medium text-slate-100">
                <Trans>No pools matched.</Trans>
              </div>
            )}

            {isLoading && <Loader />}
          </div>
        ) : (
          <TableScrollFadeContainer>
            <table className="w-[max(100%,1100px)]">
              <thead>
                <TableTheadTr bordered>
                  <TableTh className="!pl-0">
                    <Trans>POOL</Trans>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("totalSupply")}>
                      <Trans>TVL (SUPPLY)</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("wallet")}>
                      <GmTokensTotalBalanceInfo
                        balance={userTotalGmInfo?.balance}
                        balanceUsd={userTotalGmInfo?.balanceUsd}
                        userEarnings={userEarnings}
                        label={t`WALLET`}
                      />
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("apy")}>
                      <TooltipWithPortal
                        handle={t`FEE APY`}
                        className="normal-case"
                        position="bottom-end"
                        renderContent={ApyTooltipContent}
                      />
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("performance")}>
                      <TooltipWithPortal
                        handle={t`PERFORMANCE`}
                        className="normal-case"
                        position="bottom-end"
                        content={
                          <Trans>
                            Pool returns compared to the benchmark, based on UNI V2-style rebalancing of the long-short
                            token in the corresponding GM or GLV.
                          </Trans>
                        }
                      />
                    </Sorter>
                  </TableTh>

                  <TableTh>
                    <TooltipWithPortal
                      handle={t`SNAPSHOT`}
                      className="normal-case"
                      position="bottom-end"
                      content={<Trans>Graph showing performance vs benchmark over the selected period.</Trans>}
                    />
                  </TableTh>

                  <TableTh className="!pr-0" />
                </TableTheadTr>
              </thead>
              <tbody>
                {rows}

                {!currentData.length && !isLoading && (
                  <TableTr hoverable={false} bordered={false} className="h-[64.5px]">
                    <TableTd colSpan={7} className="align-top">
                      <div className="text-body-medium text-slate-100">
                        <Trans>No pools matched.</Trans>
                      </div>
                    </TableTd>
                  </TableTr>
                )}

                {!isLoading && currentData.length < DEFAULT_PAGE_SIZE && (
                  <GMListSkeleton
                    invisible
                    count={currentData.length === 0 ? DEFAULT_PAGE_SIZE - 1 : DEFAULT_PAGE_SIZE - currentData.length}
                  />
                )}
                {isLoading && <GMListSkeleton />}
              </tbody>
            </table>
          </TableScrollFadeContainer>
        )}
      </div>
    </PoolsCard>
  );
}
