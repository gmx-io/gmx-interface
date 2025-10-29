import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";

import {
  selectChainId,
  selectDepositMarketTokensData,
  selectMarketsInfoData,
  selectProgressiveDepositMarketTokensDataWithoutGlv,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTokensFavorites } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketTokensAPRData, getTotalGmInfo } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { PerformanceSnapshotsData } from "domain/synthetics/markets/usePerformanceSnapshots";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import useWallet from "lib/wallets/useWallet";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import Loader from "components/Loader/Loader";
import Pagination from "components/Pagination/Pagination";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer, TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { FeeApyLabel } from "./FeeApyLabel";
import { GmListItem } from "./GmListItem";
import { GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";
import { PerformanceLabel } from "./PerformanceLabel";
import { useFilterSortPools } from "./useFilterSortPools";

export type Props = {
  glvTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  glvTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  performance: PerformanceData | undefined;
  performanceSnapshots: PerformanceSnapshotsData | undefined;
};

export type SortField = "price" | "totalSupply" | "wallet" | "apy" | "performance" | "unspecified";

export function GmList({
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  performance,
  performanceSnapshots,
}: Props) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const marketsInfo = useSelector(selectMarketsInfoData);
  const marketTokensData = useSelector(selectDepositMarketTokensData);
  const progressiveMarketTokensData = useSelector(selectProgressiveDepositMarketTokensDataWithoutGlv);

  const { active } = useWallet();
  const userEarnings = useUserEarnings(chainId, srcChainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("gm-list");
  const [searchText, setSearchText] = useState("");
  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites("gm-list");

  const isLoading = !marketsInfo || !progressiveMarketTokensData;

  const filteredGmTokens = useFilterSortPools({
    marketsInfo,
    marketTokensData: progressiveMarketTokensData,
    orderBy,
    direction,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    searchText,
    tab,
    favoriteTokens,
    performance,
  });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredGmTokens,
    DEFAULT_PAGE_SIZE
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active || !marketTokensData) return;
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
        performance={performance}
        performanceSnapshots={performanceSnapshots}
        isFavorite={favoriteTokens.includes(token.address)}
        onFavoriteClick={toggleFavoriteToken}
      />
    ));

  const isMobile = usePoolsIsMobilePage();

  return (
    <PoolsCard
      title={t`GM Pools`}
      className="grow"
      description={
        <div className="flex flex-col gap-16">
          <Trans>
            Pools providing liquidity to specific GMX markets, supporting <br /> single-asset and native asset options.
          </Trans>
          <div className="flex flex-wrap items-center justify-between gap-12 py-8">
            <SearchInput
              size="s"
              className="w-full *:!text-body-medium md:max-w-[260px]"
              value={searchText}
              setValue={setSearchText}
              placeholder={t`Search Pools`}
              autoFocus={false}
            />
            <div className="max-w-full">
              <ButtonRowScrollFadeContainer>
                <FavoriteTabs
                  favoritesKey="gm-list"
                  className="!text-typography-secondary hover:!text-typography-primary"
                  activeClassName="!text-typography-primary"
                />
              </ButtonRowScrollFadeContainer>
            </div>
          </div>
        </div>
      }
      bottom={
        pageCount > 1 ? (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} topMargin={false} />
        ) : undefined
      }
    >
      <div className="flex grow flex-col">
        {isMobile ? (
          <div className="flex flex-col gap-4">
            {rows}
            {!currentData.length && !isLoading && (
              <EmptyTableContent emptyText={t`No pools matched`} isLoading={isLoading} isEmpty={!currentData.length} />
            )}

            {isLoading && <Loader />}
          </div>
        ) : (
          <div className="flex grow flex-col p-8 pt-0">
            <TableScrollFadeContainer className="flex grow flex-col">
              <table className="w-[max(100%,1000px)]">
                <thead>
                  <TableTheadTr>
                    <TableTh className="pl-16">
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
                        <FeeApyLabel upperCase variant="iconStroke" />
                      </Sorter>
                    </TableTh>
                    <TableTh>
                      <Sorter {...getSorterProps("performance")}>
                        <PerformanceLabel upperCase variant="iconStroke" />
                      </Sorter>
                    </TableTh>
                    <TableTh>
                      <TooltipWithPortal
                        handle={t`SNAPSHOT`}
                        className="normal-case"
                        position="bottom-end"
                        content={<Trans>Graph showing performance vs benchmark over the selected period.</Trans>}
                        variant="iconStroke"
                      />
                    </TableTh>
                    <TableTh className="pr-16" />
                  </TableTheadTr>
                </thead>
                <tbody>
                  {rows}

                  {isLoading && <GMListSkeleton />}
                </tbody>
              </table>

              {!currentData.length && !isLoading && (
                <EmptyTableContent
                  emptyText={t`No pools matched`}
                  isLoading={isLoading}
                  isEmpty={!currentData.length}
                />
              )}
            </TableScrollFadeContainer>
          </div>
        )}
      </div>
    </PoolsCard>
  );
}
