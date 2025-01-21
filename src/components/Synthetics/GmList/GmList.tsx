import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import { getIcons } from "config/icons";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTokensFavorites } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketTokensAPRData, getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
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
  shouldScrollToTop?: boolean;
  isDeposit: boolean;
};

export type SortField = "price" | "totalSupply" | "buyable" | "wallet" | "apy" | "unspecified";

export function GmList({
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectMarketsInfoData);

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit, withGlv: false });
  const { isConnected: active } = useAccount();
  const currentIcons = getIcons(chainId)!;
  const userEarnings = useUserEarnings(chainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("gm-list");
  const [searchText, setSearchText] = useState("");
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const shiftAvailableMarketAddressSet = useMemo(
    () => new Set(shiftAvailableMarkets.map((m) => m.marketTokenAddress)),
    [shiftAvailableMarkets]
  );
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

  return (
    <div className="rounded-4 bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-8 px-16 py-8">
        <div className="flex items-center ">
          <span className="text-16">
            <Trans>Pools</Trans>
          </span>
          <img src={currentIcons?.network} width="16" className="ml-5 mr-10" alt="Network Icon" />
          <SearchInput
            size="s"
            className="*:!text-body-medium"
            value={searchText}
            setValue={setSearchText}
            placeholder="Search Pool"
            autoFocus={false}
          />
        </div>
        <div className="max-w-full">
          <ButtonRowScrollFadeContainer>
            <FavoriteTabs favoritesKey="gm-list" />
          </ButtonRowScrollFadeContainer>
        </div>
      </div>
      <TableScrollFadeContainer>
        <table className="w-[max(100%,1100px)]">
          <thead>
            <TableTheadTr bordered>
              <TableTh>
                <Trans>POOL</Trans>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("price")}>
                  <Trans>PRICE</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("totalSupply")}>
                  <Trans>TOTAL SUPPLY</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("buyable")}>
                  <TooltipWithPortal
                    handle={<Trans>BUYABLE</Trans>}
                    className="normal-case"
                    position="bottom-end"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>Available amount to deposit into the specific GM pool.</Trans>
                      </p>
                    )}
                  />
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
                    handle={t`APY`}
                    className="normal-case"
                    position="bottom-end"
                    renderContent={ApyTooltipContent}
                  />
                </Sorter>
              </TableTh>

              <TableTh />
            </TableTheadTr>
          </thead>
          <tbody>
            {currentData.length > 0 &&
              currentData.map((token) => (
                <GmListItem
                  key={token.address}
                  token={token}
                  marketTokensData={marketTokensData}
                  marketsTokensApyData={marketsTokensApyData}
                  glvTokensIncentiveAprData={undefined}
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  glvTokensApyData={undefined}
                  shouldScrollToTop={shouldScrollToTop}
                  isShiftAvailable={shiftAvailableMarketAddressSet.has(token.address)}
                  isFavorite={favoriteTokens.includes(token.address)}
                  onFavoriteClick={toggleFavoriteToken}
                />
              ))}
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
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}
