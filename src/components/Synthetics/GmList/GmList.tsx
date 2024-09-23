import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import keys from "lodash/keys";
import values from "lodash/values";
import React, { useMemo, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import { getIcons } from "config/icons";
import { getNormalizedTokenSymbol, getToken } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectChainId,
  selectGlvAndMarketsInfoData,
  selectGlvInfoLoading,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  GlvAndGmMarketsInfoData,
  MarketTokensAPRData,
  getGlvDisplayName,
  getGlvMarketName,
  getGlvMarketSubtitle,
  getGlvOrMarketAddress,
  getMarketBadge,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getTotalGmInfo,
  isMarketInfo,
  useMarketTokensData,
} from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { GmTokenFavoritesTabOption, useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useFuse } from "lib/useFuse";
import { sortGmTokensByField } from "./sortGmTokensByField";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteGmTabs } from "components/FavoriteTabs/FavoriteGmTabs";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers, type SortDirection } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getMintableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { ApyTooltipContent } from "./ApyTooltipContent";
import { GmTokensBalanceInfo, GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";
import { MintableAmount } from "./MintableAmount";
import { TokenValuesInfoCell } from "./TokenValuesInfoCell";

type Props = {
  glvTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  shouldScrollToTop?: boolean;
  isDeposit: boolean;
};

const tokenAddressStyle = { fontSize: 5 };

export type SortField = "price" | "totalSupply" | "buyable" | "wallet" | "apy" | "unspecified";

export function GmList({
  marketsTokensApyData,
  glvTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectGlvAndMarketsInfoData);
  const glvsLoading = useSelector(selectGlvInfoLoading);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit });
  const { isConnected: active } = useAccount();
  const currentIcons = getIcons(chainId);
  const userEarnings = useUserEarnings(chainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchText, setSearchText] = useState("");
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const shiftAvailableMarketAddressSet = useMemo(
    () => new Set(shiftAvailableMarkets.map((m) => getGlvOrMarketAddress(m))),
    [shiftAvailableMarkets]
  );
  const { tab, favoriteTokens, toggleFavoriteToken } = useGmTokensFavorites();

  const isLoading = !marketsInfo || !marketTokensData || glvsLoading;

  const filteredGmTokens = useFilterSortPools({
    marketsInfo,
    marketTokensData,
    orderBy,
    direction,
    glvTokensApyData,
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
      <div className="flex items-center justify-between">
        <div className="flex items-center px-16 py-8">
          <span className="text-16">
            <Trans>Pools</Trans>
          </span>
          <img src={currentIcons.network} width="16" className="ml-5 mr-10" alt="Network Icon" />
          <SearchInput
            size="s"
            className="*:!text-16"
            value={searchText}
            setValue={setSearchText}
            placeholder="Search Pool"
            autoFocus={false}
          />
        </div>
        <div className="pr-16">
          <FavoriteGmTabs />
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
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  glvTokensApyData={glvTokensApyData}
                  shouldScrollToTop={shouldScrollToTop}
                  isShiftAvailable={token.symbol === "GLV" ? false : shiftAvailableMarketAddressSet.has(token.address)}
                  isFavorite={favoriteTokens.includes(token.address)}
                  onFavoriteClick={toggleFavoriteToken}
                />
              ))}
            {!currentData.length && !isLoading && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd colSpan={7}>
                  <div className="text-center text-gray-400">
                    <Trans>No GM pools found.</Trans>
                  </div>
                </TableTd>
              </TableTr>
            )}

            {!isLoading && currentData.length > 0 && currentData.length < DEFAULT_PAGE_SIZE && (
              <GMListSkeleton invisible count={DEFAULT_PAGE_SIZE - currentData.length} />
            )}
            {isLoading && <GMListSkeleton />}
          </tbody>
        </table>
      </TableScrollFadeContainer>
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}

function useFilterSortPools({
  marketsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvTokensApyData,
  searchText,
  tab,
  favoriteTokens,
}: {
  marketsInfo: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
  searchText: string;
  tab: GmTokenFavoritesTabOption;
  favoriteTokens: string[];
}) {
  const chainId = useSelector(selectChainId);

  const fuse = useFuse(
    () =>
      values(marketsInfo).map((market) => ({
        id: getGlvOrMarketAddress(market),
        glvOrMarketAddress: getGlvOrMarketAddress(market),
        longTokenAddress: market.longTokenAddress,
        shortTokenAddress: market.shortTokenAddress,
        indexTokenAddress: isMarketInfo(market)
          ? market.indexTokenAddress === zeroAddress
            ? undefined
            : market.indexTokenAddress
          : undefined,
        longTokenName: getToken(chainId, market.longTokenAddress).name,
        shortTokenName: getToken(chainId, market.shortTokenAddress).name,
        indexTokenName: isMarketInfo(market)
          ? market.indexTokenAddress === zeroAddress
            ? ""
            : getToken(chainId, market.indexTokenAddress).name
          : undefined,
        name: isGlvInfo(market)
          ? getGlvMarketSubtitle(chainId, market.glvTokenAddress) || getGlvMarketName(chainId, market.glvTokenAddress)
          : getMarketIndexName({
              indexToken: getToken(chainId, market.indexTokenAddress),
              isSpotOnly: market.indexTokenAddress === zeroAddress,
            }),
      })),
    {
      name: {
        weight: 2,
      },
      indexTokenName: {
        weight: 2,
      },
    },
    [chainId, keys(marketsInfo).join(",")]
  );

  const sortedTokens = useMemo(() => {
    if (!marketsInfo || !marketTokensData) {
      return [];
    }

    if (searchText.trim()) {
      return fuse.search(searchText).map((result) => marketTokensData[result.item.glvOrMarketAddress]);
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortGmTokensDefault(marketsInfo, marketTokensData);
    }

    return sortGmTokensByField({
      chainId,
      marketsInfo,
      marketTokensData,
      orderBy,
      direction,
      marketsTokensApyData,
      marketsTokensIncentiveAprData,
      marketsTokensLidoAprData,
      glvTokensApyData,
    });
  }, [
    marketsInfo,
    marketTokensData,
    searchText,
    orderBy,
    direction,
    chainId,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensApyData,
    marketsTokensLidoAprData,
    fuse,
  ]);

  const filteredTokens = useMemo(() => {
    if (!searchText.trim() && tab === "all") {
      return sortedTokens;
    }

    return sortedTokens.filter((token) => {
      const market = getByKey(marketsInfo, token?.address);

      if (!market) {
        return false;
      }

      const marketOrGlvTokenAddress = getGlvOrMarketAddress(market);

      const favoriteMatch = tab === "favorites" ? favoriteTokens?.includes(marketOrGlvTokenAddress) : true;

      return favoriteMatch;
    });
  }, [favoriteTokens, marketsInfo, searchText, sortedTokens, tab]);

  return filteredTokens;
}

function GmListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvTokensApyData,
  shouldScrollToTop,
  isShiftAvailable,
  marketTokensData,
  isFavorite,
  onFavoriteClick,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
  shouldScrollToTop: boolean | undefined;
  isShiftAvailable: boolean;
  marketTokensData: TokensData | undefined;
  isFavorite: boolean;
  onFavoriteClick: (address: string) => void;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId);
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { showDebugValues } = useSettings();

  const marketOrGlv = getByKey(marketsInfoData, token?.address);

  const isGlv = isGlvInfo(marketOrGlv);

  const indexToken = isGlv ? marketOrGlv.glvToken : getTokenData(tokensData, marketOrGlv?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, marketOrGlv?.longTokenAddress);
  const shortToken = getTokenData(tokensData, marketOrGlv?.shortTokenAddress);

  const marketOrGlvTokenAddress = marketOrGlv && getGlvOrMarketAddress(marketOrGlv);

  const mintableInfo = useMemo(() => {
    if (!marketOrGlv || !token || isGlv) {
      return undefined;
    }

    return getMintableMarketTokens(marketOrGlv, token);
  }, [marketOrGlv, token, isGlv]);

  const shiftButton = useMemo(() => {
    const btn = (
      <Button
        className={cx("w-full", {
          "!opacity-30": !isShiftAvailable,
        })}
        variant="secondary"
        disabled={!isShiftAvailable}
        to={`/pools/?market=${marketOrGlvTokenAddress}&operation=shift&scroll=${shouldScrollToTop ? "1" : "0"}`}
      >
        <Trans>Shift</Trans>
      </Button>
    );

    if (isGlv) {
      return (
        <TooltipWithPortal
          content={
            <Trans>
              Shifting from GLV to another pool is not possible, as GLV can only be sold into the backing tokens.
              However, you can buy GLV tokens without incurring buying fees by using eligible GM pool tokens.
            </Trans>
          }
          handle={btn}
          disableHandleStyle
        />
      );
    }

    return (
      <TooltipWithPortal
        disabled={isShiftAvailable}
        content={t`Shift is only applicable to GM pools when there are other pools with the same backing tokens, allowing liquidity to be moved without incurring buy or sell fees.`}
        disableHandleStyle
        handleClassName="block"
        position="bottom-end"
      >
        {btn}
      </TooltipWithPortal>
    );
  }, [isShiftAvailable, marketOrGlvTokenAddress, shouldScrollToTop, isGlv]);

  const apy = isGlv
    ? getByKey(glvTokensApyData, marketOrGlvTokenAddress)
    : getByKey(marketsTokensApyData, token?.address);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, token?.address);
  const lidoApr = getByKey(marketsTokensLidoAprData, token?.address);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

  if (!token || !indexToken || !longToken || !shortToken) {
    return null;
  }

  const totalSupply = token?.totalSupply;
  const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
  const tokenIconName = marketOrGlv?.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const tokenIconBadge = getMarketBadge(chainId, marketOrGlv);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!marketOrGlvTokenAddress) return;
    onFavoriteClick(marketOrGlvTokenAddress);
  };

  return (
    <TableTr key={token.address} hoverable={false} bordered={false}>
      <TableTd>
        <div className="flex items-start">
          <div
            className="-ml-8 mr-4 cursor-pointer self-center rounded-4 p-8 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
            onClick={handleFavoriteClick}
          >
            <FavoriteStar isFavorite={isFavorite} />
          </div>
          <div className="mr-12 flex shrink-0 items-center">
            <TokenIcon
              symbol={tokenIconName}
              displaySize={40}
              importSize={40}
              badge={tokenIconBadge}
              className="min-h-40 min-w-40"
            />
          </div>
          <div>
            <div className="flex text-16">
              {isGlv
                ? getGlvDisplayName(marketOrGlv)
                : getMarketIndexName({ indexToken, isSpotOnly: Boolean(marketOrGlv?.isSpotOnly) })}

              <div className="inline-block">
                <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
              </div>
            </div>
            <div className="text-12 tracking-normal text-gray-400">
              [{getMarketPoolName({ longToken, shortToken })}]
            </div>
          </div>
        </div>
        {showDebugValues && <span style={tokenAddressStyle}>{marketOrGlvTokenAddress}</span>}
      </TableTd>
      <TableTd>{formatUsdPrice(token.prices?.minPrice)}</TableTd>
      <TableTd>
        <TokenValuesInfoCell
          token={formatTokenAmount(totalSupply, token.decimals, token.symbol, {
            useCommas: true,
            displayDecimals: 2,
          })}
          usd={formatUsd(totalSupplyUsd)}
        />
      </TableTd>
      <TableTd>
        {isGlv ? (
          <MintableAmount
            mintableInfo={getMintableInfoGlv(marketOrGlv, marketTokensData)}
            market={marketOrGlv}
            token={token}
          />
        ) : (
          marketOrGlv && (
            <MintableAmount
              mintableInfo={mintableInfo}
              market={marketOrGlv}
              token={token}
              longToken={longToken}
              shortToken={shortToken}
            />
          )
        )}
      </TableTd>

      <TableTd>
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
          isGlv={isGlv}
        />
      </TableTd>

      <TableTd>
        <AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} marketAddress={token.address} />
      </TableTd>

      <TableTd className="w-[350px]">
        <div className="grid grid-cols-3 gap-10">
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${marketOrGlvTokenAddress}&operation=buy&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Buy</Trans>
          </Button>
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${marketOrGlvTokenAddress}&operation=sell&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Sell</Trans>
          </Button>
          <div className="flex-grow">{shiftButton}</div>
        </div>
      </TableTd>
    </TableTr>
  );
}
