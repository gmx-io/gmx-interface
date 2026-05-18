import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";

import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import {
  selectChainId,
  selectDepositMarketTokensData,
  selectMarketsInfoData,
  selectProgressiveDepositMarketTokensDataWithoutGlv,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  SubCategoryTab,
  cryptoSubCategoryOptions,
  subCategoryTabLabels,
  tradfiSubCategoryOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketTokensAPRData, getTotalGmInfo } from "domain/synthetics/markets";
import { useMarketsListingDates } from "domain/synthetics/markets/useMarketsListingDates";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { PerformanceSnapshotsData } from "domain/synthetics/markets/usePerformanceSnapshots";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { useLocalizedMap } from "lib/i18n";
import useWallet from "lib/wallets/useWallet";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { getRecentlyListedTokenAddresses } from "components/ChartTokenSelector/marketFilters";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import Loader from "components/Loader/Loader";
import Pagination from "components/Pagination/Pagination";
import usePagination, { DEFAULT_PAGE_SIZE } from "components/Pagination/usePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer, TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
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
  apyLoading: boolean;
  performance: PerformanceData | undefined;
  performanceLoading: boolean;
  performanceSnapshots: PerformanceSnapshotsData | undefined;
};

export type SortField = "price" | "totalSupply" | "balance" | "apy" | "performance" | "unspecified";

export function GmList({
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  apyLoading,
  performance,
  performanceLoading,
  performanceSnapshots,
}: Props) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const marketsInfo = useSelector(selectMarketsInfoData);
  const marketTokensData = useSelector(selectDepositMarketTokensData);
  const progressiveMarketTokensData = useSelector(selectProgressiveDepositMarketTokensDataWithoutGlv);
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const { active } = useWallet();
  const { userEarnings } = useUserEarnings(chainId, srcChainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("gm-list");
  const [searchText, setSearchText] = useState("");
  const { topLevelTab, subCategoryTab, setSubCategoryTab, favoriteTokens, toggleFavoriteToken } =
    useTokensFavorites("gm-list");
  const localizedSubCategoryLabels = useLocalizedMap(subCategoryTabLabels);

  const { listingDateByIndexToken } = useMarketsListingDates(chainId);

  const recentlyListedAddressesSet = useMemo(
    () => new Set(getRecentlyListedTokenAddresses(listingDateByIndexToken, Date.now())),
    [listingDateByIndexToken]
  );

  const recentlyListedCount = useMemo(() => {
    if (!marketsInfo || recentlyListedAddressesSet.size === 0) return 0;
    return Object.values(marketsInfo).filter(
      (m) => !m.isSpotOnly && !m.isDisabled && recentlyListedAddressesSet.has(m.indexTokenAddress.toLowerCase())
    ).length;
  }, [marketsInfo, recentlyListedAddressesSet]);

  const isLoading = !marketsInfo || !progressiveMarketTokensData;

  const populatedCryptoSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    if (!marketsInfo) return set;
    for (const cat of ["ai", "layer1", "layer2", "defi", "meme"] as const) {
      const found = Object.values(marketsInfo).some(
        (m) => !m.isSpotOnly && !m.isDisabled && m.indexToken.categories?.includes(cat)
      );
      if (found) set.add(cat);
    }
    return set;
  }, [marketsInfo]);

  const populatedTradfiSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    if (!marketsInfo) return set;
    for (const cat of ["commodities", "stocks", "indices", "fx"] as const) {
      const found = Object.values(marketsInfo).some(
        (m) => !m.isSpotOnly && !m.isDisabled && m.indexToken?.categories?.includes(cat)
      );
      if (found) set.add(cat);
    }
    return set;
  }, [marketsInfo]);

  const cryptoSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      cryptoSubCategoryOptions
        .filter((opt) => opt === "all" || populatedCryptoSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [populatedCryptoSubCats, localizedSubCategoryLabels]
  );

  const tradfiSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      tradfiSubCategoryOptions
        .filter((opt) => opt === "all" || populatedTradfiSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [populatedTradfiSubCats, localizedSubCategoryLabels]
  );

  const filteredGmTokens = useFilterSortPools({
    marketsInfo,
    marketTokensData: progressiveMarketTokensData,
    orderBy,
    direction,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    searchText,
    topLevelTab,
    subCategoryTab,
    recentlyListedAddresses: recentlyListedAddressesSet,
    favoriteTokens,
    performance,
    multichainMarketTokensBalances,
  });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredGmTokens,
    DEFAULT_PAGE_SIZE
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active || !marketTokensData) return;
    return getTotalGmInfo({ tokensData: marketTokensData, multichainMarketTokensBalances });
  }, [active, marketTokensData, multichainMarketTokensBalances]);

  const rows =
    currentData.length > 0 &&
    currentData.map((token) => {
      return (
        <GmListItem
          key={token.address}
          token={token}
          marketsTokensApyData={marketsTokensApyData}
          glvTokensIncentiveAprData={undefined}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          glvTokensApyData={undefined}
          apyLoading={apyLoading}
          performance={performance}
          performanceLoading={performanceLoading}
          performanceSnapshots={performanceSnapshots}
          isFavorite={favoriteTokens.includes(token.address)}
          onFavoriteClick={toggleFavoriteToken}
        />
      );
    });

  const isMobile = usePoolsIsMobilePage();

  return (
    <PoolsCard
      title={t`GM pools`}
      className="grow"
      description={
        <div className="flex flex-col gap-16">
          <Trans>Liquidity pools for specific GMX markets with single-asset and native asset options</Trans>
          <div className="flex flex-wrap items-center justify-between gap-12 max-md:flex-wrap-reverse">
            <div className="max-w-full">
              <ButtonRowScrollFadeContainer>
                <FavoriteTabs favoritesKey="gm-list" recentlyListedCount={recentlyListedCount} type="inline" />
              </ButtonRowScrollFadeContainer>
            </div>

            <SearchInput
              className="w-full *:!text-body-medium md:max-w-[260px]"
              value={searchText}
              setValue={setSearchText}
              placeholder={t`Search pools`}
              autoFocus={false}
            />
          </div>
        </div>
      }
      contentHeader={
        <div>
          {topLevelTab === "crypto" && populatedCryptoSubCats.size > 0 && (
            <div className="flex w-full justify-start">
              <ButtonRowScrollFadeContainer className="grow">
                <Tabs
                  options={cryptoSubCatTabs}
                  selectedValue={subCategoryTab}
                  onChange={setSubCategoryTab}
                  type="block"
                  className="bg-slate-800/50 px-20"
                  tabsWrapperClassName="gap-16"
                  regularOptionClassname="!px-0 !pb-9 !pt-11 text-13"
                />
              </ButtonRowScrollFadeContainer>
            </div>
          )}
          {topLevelTab === "tradfi" && populatedTradfiSubCats.size > 0 && (
            <div className="flex w-full justify-start">
              <ButtonRowScrollFadeContainer className="grow">
                <Tabs
                  options={tradfiSubCatTabs}
                  selectedValue={subCategoryTab}
                  onChange={setSubCategoryTab}
                  type="block"
                  className="bg-slate-800/50 px-20"
                  tabsWrapperClassName="gap-16"
                  regularOptionClassname="!px-0 !pb-9 !pt-11 text-13"
                />
              </ButtonRowScrollFadeContainer>
            </div>
          )}
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
                    <TableTh className="!pl-12">
                      <Trans>POOL</Trans>
                    </TableTh>
                    <TableTh>
                      <Sorter {...getSorterProps("totalSupply")}>
                        <Trans>TVL (SUPPLY)</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh>
                      <Sorter {...getSorterProps("balance")}>
                        <GmTokensTotalBalanceInfo
                          balance={userTotalGmInfo?.balance}
                          balanceUsd={userTotalGmInfo?.balanceUsd}
                          userEarnings={userEarnings}
                          label={t`BALANCE`}
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
                        content={<Trans>Performance vs benchmark over the selected period</Trans>}
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
