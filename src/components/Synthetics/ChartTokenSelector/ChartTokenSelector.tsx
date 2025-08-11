import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import partition from "lodash/partition";
import React, { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import type { SortDirection } from "context/SorterContext/types";
import { selectAvailableChartTokens } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectIndexTokenStatsMap } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  TokenOption,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxGetMaxLongShortLiquidityPool,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  TokenFavoritesTabOption,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketBaseName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { IndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { PriceDelta, PriceDeltaMap, TokenData, TokensData, use24hPriceDeltaMap } from "domain/synthetics/tokens";
import { use24hVolumes } from "domain/synthetics/tokens/use24Volumes";
import { TradeType } from "domain/synthetics/trade";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";
import { stripBlacklistedWords, type Token } from "domain/tokens";
import { getMidPrice } from "domain/tokens/utils";
import { useBreakpoints } from "lib/breakpoints";
import { formatAmountHuman, formatUsdPrice } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { searchBy } from "lib/searchBy";
import {
  convertTokenAddress,
  getCategoryTokenAddresses,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "sdk/configs/tokens";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";

import { SelectorBase, SelectorBaseMobileHeaderContent, useSelectorClose } from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  oneRowLabels?: boolean;
};

export default function ChartTokenSelector(props: Props) {
  const { selectedToken, oneRowLabels } = props;

  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);
  const poolName = marketInfo && !isSwap ? getMarketPoolName(marketInfo) : null;

  const { isMobile } = useBreakpoints();

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      popoverYOffset={8}
      popoverXOffset={0}
      handleClassName={cx("group rounded-8 bg-slate-800 py-10 pl-8 pr-12", {
        "mr-24": oneRowLabels === false,
        "h-40 py-0": isSwap,
      })}
      desktopPanelClassName={cx("max-w-[100vw]", { "w-[520px]": isSwap, "w-[880px]": !isSwap })}
      chevronClassName={isMobile && !isSwap ? "-mt-20" : undefined}
      label={
        selectedToken ? (
          <span
            className={cx("inline-flex gap-6 whitespace-nowrap pl-0 text-[13px]", {
              "items-start": !oneRowLabels,
              "items-center": oneRowLabels || isSwap,
            })}
          >
            {isSwap ? (
              <div className="rounded-4 bg-blue-300 bg-opacity-[20%] px-7 py-4 text-blue-300">
                <Trans>Swap</Trans>
              </div>
            ) : null}

            <TokenIcon symbol={selectedToken.symbol} displaySize={isMobile ? 32 : 20} importSize={40} />
            <span
              className={cx("flex justify-start", {
                "flex-col": !oneRowLabels && !isSwap,
                "flex-row items-center": oneRowLabels || isSwap,
              })}
            >
              <span className="text-[13px] font-medium group-hover:text-blue-300 group-active:text-blue-300">
                {!isSwap && <>{getTokenVisualMultiplier(selectedToken)}</>}
                {selectedToken.symbol}/USD
              </span>
              {poolName && (
                <span
                  className={cx(
                    "text-body-small mt-1 font-normal text-slate-100 group-hover:text-blue-300 group-active:text-blue-300",
                    {
                      "ml-8": oneRowLabels,
                    }
                  )}
                >
                  <span>[{poolName}]</span>
                </span>
              )}
            </span>
          </span>
        ) : (
          "..."
        )
      }
      modalLabel={t`Market`}
      mobileModalContentPadding={false}
    >
      <MarketsList />
    </SelectorBase>
  );
}

type SortField =
  | "lastPrice"
  | "24hChange"
  | "24hVolume"
  | "longLiquidity"
  | "shortLiquidity"
  | "combinedAvailableLiquidity"
  | "combinedOpenInterest"
  | "unspecified";

function MarketsList() {
  const chainId = useSelector(selectChainId);
  const availableTokens = useSelector(selectAvailableChartTokens);
  const tradeType = useSelector(selectTradeboxTradeType);
  const chooseSuitableMarket = useSelector(selectTradeboxChooseSuitableMarket);
  const tokensData = useSelector(selectTokensData);

  const { availableChartTokens: options, availableChartTokenAddresses } = useMemo(() => {
    const availableChartTokens = availableTokens?.filter((token) => isChartAvailableForToken(chainId, token.symbol));
    const availableChartTokenAddresses = availableChartTokens?.map((token) => token.address as Address);

    return {
      availableChartTokens,
      availableChartTokenAddresses,
    };
  }, [availableTokens, chainId]);

  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites("chart-token-selector");

  const dayPriceDeltaMap = use24hPriceDeltaMap(chainId, availableChartTokenAddresses);
  const dayVolumesData = use24hVolumes();
  const dayVolumes = dayVolumesData?.byIndexToken;
  const indexTokenStatsMap = useSelector(selectIndexTokenStatsMap).indexMap;

  const { isMobile, isSmallMobile } = useBreakpoints();

  const close = useSelectorClose();

  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("chart-token-selector");
  const [searchKeyword, setSearchKeyword] = useState("");
  const isSwap = tradeType === TradeType.Swap;

  const sortedTokens = useFilterSortTokens({
    chainId,
    options,
    searchKeyword,
    tab,
    favoriteTokens,
    direction,
    orderBy,
    tokensData,
    dayPriceDeltaMap,
    dayVolumes,
    indexTokenStatsMap,
    isSwap,
  });

  const sortedDetails = useMemo(() => {
    if (!sortedTokens) {
      return EMPTY_ARRAY;
    }

    return sortedTokens.map((token) => {
      const wrappedAddress = convertTokenAddress(chainId, token.address, "wrapped") as Address;
      return {
        token,
        tokenData: tokensData?.[wrappedAddress],
        dayPriceDelta: dayPriceDeltaMap?.[token.address],
        dayVolume: dayVolumes?.[wrappedAddress],
        openInterestLong: indexTokenStatsMap?.[wrappedAddress]?.totalOpenInterestLong,
        openInterestShort: indexTokenStatsMap?.[wrappedAddress]?.totalOpenInterestShort,
        maxLeverage: indexTokenStatsMap?.[wrappedAddress]?.maxUiAllowedLeverage,
      };
    });
  }, [sortedTokens, chainId, tokensData, dayPriceDeltaMap, dayVolumes, indexTokenStatsMap]);

  useMissedCoinsSearch({
    searchText: searchKeyword,
    isEmpty: !sortedTokens?.length && tab === "all",
    isLoaded: Boolean(options?.length),
    place: MissedCoinsPlace.marketDropdown,
  });

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
      close();

      chooseSuitableMarket(tokenAddress, preferredTradeType, tradeType);
    },
    [chooseSuitableMarket, close, tradeType]
  );

  const rowVerticalPadding = cx("px-12 py-10", {
    "group-last-of-type/row:pb-8": !isMobile,
  });
  const rowHorizontalPadding = cx("pr-8");
  const thClassName = cx(
    "sticky top-0 z-10 whitespace-nowrap bg-slate-900 text-left text-[11px] font-medium uppercase text-slate-100",
    "first-of-type:text-left",
    "first-of-type:!pl-44",
    rowVerticalPadding,
    rowHorizontalPadding
  );

  const tdClassName = cx(
    "text-body-small",
    isMobile ? "align-top" : "align-middle",
    rowVerticalPadding,
    rowHorizontalPadding
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && sortedTokens && sortedTokens.length > 0) {
        const token = sortedTokens[0];
        handleMarketSelect(token.address);
      }
    },
    [sortedTokens, handleMarketSelect]
  );

  const placeholder = useMemo(() => {
    if (isSwap) {
      return t`Search Token`;
    }

    return t`Search Market`;
  }, [isSwap]);

  const availableLiquidityLabel = isMobile ? (isSmallMobile ? t`LIQ.` : t`AVAIL. LIQ.`) : t`AVAILABLE LIQ.`;

  return (
    <>
      <SelectorBaseMobileHeaderContent>
        <div className="flex flex-col gap-12">
          <SearchInput
            className="w-full *:!text-body-medium"
            value={searchKeyword}
            setValue={setSearchKeyword}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />

          <ButtonRowScrollFadeContainer>
            <FavoriteTabs favoritesKey="chart-token-selector" />
          </ButtonRowScrollFadeContainer>
        </div>
        <div className="mt-12 h-[0.5px] w-[2000px] -translate-x-1/2 bg-slate-600" />
      </SelectorBaseMobileHeaderContent>

      {!isMobile && (
        <>
          <div className="flex flex-col justify-between gap-16 border-b-stroke border-slate-600 p-12">
            <SearchInput
              className="w-full"
              value={searchKeyword}
              setValue={setSearchKeyword}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
            />
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs favoritesKey="chart-token-selector" />
            </ButtonRowScrollFadeContainer>
          </div>
        </>
      )}

      <div
        className={cx({
          "max-h-[444px] overflow-x-auto": !isMobile,
        })}
      >
        <table className="text-sm w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={cx(thClassName, isMobile ? "min-w-[18ch]" : "min-w-[28ch]")} colSpan={2}>
                <Trans>Market</Trans>
              </th>
              {isSwap ? (
                <>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("lastPrice")}>
                      {isSmallMobile ? <Trans>PRICE</Trans> : <Trans>LAST PRICE</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("24hChange")}>
                        <Trans>24H%</Trans>
                      </Sorter>
                    </th>
                  )}
                </>
              ) : (
                <>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("lastPrice")}>
                      {isSmallMobile ? <Trans>PRICE</Trans> : <Trans>LAST PRICE</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("24hChange")}>
                        <Trans>24H%</Trans>
                      </Sorter>
                    </th>
                  )}
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("24hVolume")}>
                      {isSmallMobile ? <Trans>VOL.</Trans> : <Trans>24H VOL.</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <>
                      <th className={thClassName} colSpan={2}>
                        <Sorter {...getSorterProps("combinedOpenInterest")}>
                          <Trans>OPEN INTEREST</Trans>
                        </Sorter>
                      </th>
                      <th className={thClassName} colSpan={2}>
                        <Sorter {...getSorterProps("combinedAvailableLiquidity")}>{availableLiquidityLabel}</Sorter>
                      </th>
                    </>
                  )}
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedDetails?.map(
              ({ token, tokenData, dayPriceDelta, dayVolume, openInterestLong, openInterestShort, maxLeverage }) => (
                <MarketListItem
                  key={token.address}
                  token={token}
                  tokenData={tokenData}
                  dayPriceDelta={dayPriceDelta}
                  dayVolume={dayVolume}
                  openInterestLong={openInterestLong}
                  openInterestShort={openInterestShort}
                  maxLeverage={maxLeverage}
                  isSwap={isSwap}
                  isMobile={isMobile}
                  isFavorite={favoriteTokens?.includes(token.address)}
                  onFavorite={toggleFavoriteToken}
                  rowVerticalPadding={rowVerticalPadding}
                  rowHorizontalPadding={rowHorizontalPadding}
                  tdClassName={tdClassName}
                  onMarketSelect={handleMarketSelect}
                />
              )
            )}
          </tbody>
        </table>
        {options && options.length > 0 && !sortedTokens?.length && (
          <EmptyTableContent isLoading={false} isEmpty={true} emptyText={<Trans>No markets matched</Trans>} />
        )}
      </div>
    </>
  );
}

function useFilterSortTokens({
  chainId,
  options,
  searchKeyword,
  tab,
  favoriteTokens,
  direction,
  orderBy,
  tokensData,
  dayPriceDeltaMap,
  dayVolumes,
  indexTokenStatsMap,
  isSwap,
}: {
  chainId: number;
  options: Token[] | undefined;
  searchKeyword: string;
  tab: TokenFavoritesTabOption;
  favoriteTokens: string[];
  direction: SortDirection;
  orderBy: SortField;
  tokensData: TokensData | undefined;
  dayPriceDeltaMap: PriceDeltaMap | undefined;
  dayVolumes: Record<Address, bigint> | undefined;
  indexTokenStatsMap: Partial<IndexTokensStats> | undefined;
  isSwap: boolean;
}) {
  const filteredTokens: Token[] | undefined = useMemo(() => {
    const textMatched =
      searchKeyword.trim() && options
        ? searchBy(
            options,
            [
              (item) => stripBlacklistedWords(item.name),
              (item) => (isSwap ? item.symbol : `${getTokenVisualMultiplier(item)}${item.symbol}`),
            ],
            searchKeyword
          )
        : options;

    if (tab === "all") {
      return textMatched;
    }

    if (tab === "favorites") {
      return textMatched?.filter((item) => favoriteTokens?.includes(item.address));
    }

    const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);
    const tabMatched = textMatched?.filter((item) => categoryTokenAddresses.includes(item.address));

    return tabMatched;
  }, [chainId, favoriteTokens, isSwap, options, searchKeyword, tab]);

  const getMaxLongShortLiquidityPool = useSelector(selectTradeboxGetMaxLongShortLiquidityPool);

  const sortedTokens = useMemo(() => {
    const [favorites, nonFavorites] = partition(filteredTokens, (token) => favoriteTokens.includes(token.address));

    const sorter = tokenSortingComparatorBuilder({
      chainId,
      orderBy,
      direction,
      tokensData,
      dayPriceDeltaMap,
      dayVolumes,
      indexTokenStatsMap,
      getMaxLongShortLiquidityPool,
      isSwap,
    });

    const sortedFavorites = favorites.slice().sort(sorter);

    const sortedNonFavorites = nonFavorites.slice().sort(sorter);

    return [...sortedFavorites, ...sortedNonFavorites];
  }, [
    filteredTokens,
    chainId,
    orderBy,
    direction,
    tokensData,
    dayPriceDeltaMap,
    dayVolumes,
    indexTokenStatsMap,
    getMaxLongShortLiquidityPool,
    favoriteTokens,
    isSwap,
  ]);

  return sortedTokens;
}

const MarketLabel = ({ token }: { token: Token }) => {
  return (
    <span className="text-slate-100">
      <span className="text-white">{getMarketBaseName({ indexToken: token, isSpotOnly: false })}</span>
      /USD
    </span>
  );
};

function MarketListItem({
  token,
  tokenData,
  dayPriceDelta,
  dayVolume,
  openInterestLong,
  openInterestShort,
  maxLeverage,
  isSwap,
  isMobile,
  isFavorite,
  onFavorite,
  rowVerticalPadding,
  rowHorizontalPadding,
  tdClassName,
  onMarketSelect,
}: {
  token: Token;
  tokenData: TokenData | undefined;
  dayPriceDelta: PriceDelta | undefined;
  dayVolume: bigint | undefined;
  openInterestLong: bigint | undefined;
  openInterestShort: bigint | undefined;
  maxLeverage: number | undefined;
  isSwap: boolean;
  isMobile: boolean;
  isFavorite?: boolean;
  onFavorite: (address: string) => void;
  rowVerticalPadding: string;
  rowHorizontalPadding: string;
  tdClassName: string;
  onMarketSelect: (address: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => void;
}) {
  const getMaxLongShortLiquidityPool = useSelector(selectTradeboxGetMaxLongShortLiquidityPool);

  const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      e.stopPropagation();
      onFavorite(token.address);
    },
    [onFavorite, token.address]
  );

  const handleSelectLargePosition = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement | HTMLTableRowElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, "largestPosition");
    },
    [onMarketSelect, token.address]
  );

  const handleSelectLong = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, TradeType.Long);
    },
    [onMarketSelect, token.address]
  );

  const handleSelectShort = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, TradeType.Short);
    },
    [onMarketSelect, token.address]
  );

  const dayPriceDeltaComponent = useMemo(() => {
    return (
      <div
        className={cx("numbers", {
          positive: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage > 0,
          negative: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage < 0,
        })}
      >
        {dayPriceDelta?.deltaPercentageStr || "-"}
      </div>
    );
  }, [dayPriceDelta]);

  if (isSwap) {
    return (
      <tr key={token.symbol} className="group/row cursor-pointer hover:bg-slate-800">
        <td className={cx("pl-14 pr-6 text-center text-slate-100", rowVerticalPadding)} onClick={handleFavoriteClick}>
          <FavoriteStar isFavorite={isFavorite} className="!h-12 !w-12" />
        </td>
        <td
          className={cx("text-body-medium w-full", rowVerticalPadding, rowHorizontalPadding)}
          onClick={handleSelectLargePosition}
        >
          <span className="flex items-center gap-4">
            <TokenIcon
              className="ChartToken-list-icon -my-5 mr-6"
              symbol={token.symbol}
              displaySize={16}
              importSize={24}
            />
            <span>{token.name}</span>
            <span className="font-medium text-slate-100">{token.symbol}</span>
          </span>
        </td>
        <td className={tdClassName}>
          <div className="flex flex-col gap-4">
            <span className="numbers">
              {tokenData
                ? formatUsdPrice(getMidPrice(tokenData.prices), { visualMultiplier: tokenData.visualMultiplier })
                : "-"}
            </span>
            {isMobile && <span>{dayPriceDeltaComponent}</span>}
          </div>
        </td>
        {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      </tr>
    );
  }

  return (
    <tr key={token.symbol} className="group/row cursor-pointer hover:bg-slate-800" onClick={handleSelectLargePosition}>
      <td className={cx("px-12 text-center text-slate-100", rowVerticalPadding)} onClick={handleFavoriteClick}>
        <FavoriteStar isFavorite={isFavorite} className="!h-12 !w-12" />
      </td>
      <td className={cx("pl-4 text-[13px]", rowVerticalPadding, isMobile ? "pr-2" : "pr-8")}>
        <div className={cx("flex", isMobile ? "items-start" : "items-center")}>
          <TokenIcon className="ChartToken-list-icon mr-6" symbol={token.symbol} displaySize={16} importSize={24} />
          <span className={cx("flex flex-wrap items-center gap-6")}>
            <span className="font-medium leading-1">
              <MarketLabel token={token} />
            </span>
            <span className="rounded-full bg-slate-700 px-6 py-[1.5px] text-12 font-medium leading-[1.25] text-slate-100 numbers">
              {maxLeverage ? `${maxLeverage}x` : "-"}
            </span>
          </span>
        </div>
      </td>

      <td className={tdClassName}>
        <div className="flex flex-col gap-4">
          <span className="numbers">
            {tokenData
              ? formatUsdPrice(getMidPrice(tokenData.prices), { visualMultiplier: tokenData.visualMultiplier })
              : "-"}
          </span>
          {isMobile && <span>{dayPriceDeltaComponent}</span>}
        </div>
      </td>
      {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      <td className={cx(tdClassName, "numbers")}>
        {dayVolume ? formatAmountHuman(dayVolume, USD_DECIMALS, true) : "-"}
      </td>
      {!isMobile && (
        <>
          <td className={cx(tdClassName, "pr-4 numbers")}>
            <span className="inline-flex items-center gap-6">
              <LongIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(openInterestLong ?? 0n, USD_DECIMALS, true)}
            </span>
          </td>
          <td className={cx(tdClassName, "pl-4 numbers")}>
            <span className="mb-2 inline-flex items-center gap-6">
              <ShortIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(openInterestShort ?? 0n, USD_DECIMALS, true)}
            </span>
          </td>
        </>
      )}

      {!isMobile ? (
        <>
          <td className={cx(tdClassName, "group pr-4 numbers hover:bg-slate-800")} onClick={handleSelectLong}>
            <div className="inline-flex items-center justify-end gap-6">
              <LongIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(maxLongLiquidityPool?.maxLongLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
          <td className={cx(tdClassName, "group pl-4 numbers hover:bg-slate-800")} onClick={handleSelectShort}>
            <div className="inline-flex items-center justify-end gap-6">
              <ShortIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(maxShortLiquidityPool?.maxShortLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
        </>
      ) : null}
    </tr>
  );
}

function tokenSortingComparatorBuilder({
  chainId,
  orderBy,
  direction,
  tokensData,
  dayPriceDeltaMap,
  dayVolumes,
  indexTokenStatsMap,
  getMaxLongShortLiquidityPool,
  isSwap,
}: {
  chainId: number;
  orderBy: SortField;
  direction: SortDirection;
  tokensData: TokensData | undefined;
  dayPriceDeltaMap: PriceDeltaMap | undefined;
  dayVolumes: Record<Address, bigint> | undefined;
  indexTokenStatsMap: Partial<IndexTokensStats> | undefined;
  getMaxLongShortLiquidityPool: (token: Token) => {
    maxLongLiquidityPool: TokenOption;
    maxShortLiquidityPool: TokenOption;
  };
  isSwap: boolean;
}) {
  const directionMultiplier = direction === "asc" ? 1 : -1;

  return (a: Token, b: Token) => {
    const aAddress = convertTokenAddress(chainId, a.address, "wrapped");
    const bAddress = convertTokenAddress(chainId, b.address, "wrapped");

    if (isSwap) {
      // Swap tokens are already sorted by long and short tokens
      return 0;
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      // Tokens are already sorted by pool size
      return 0;
    }

    if (orderBy === "24hVolume") {
      const aVolume = dayVolumes?.[aAddress] || 0n;
      const bVolume = dayVolumes?.[bAddress] || 0n;
      return aVolume > bVolume ? directionMultiplier : -directionMultiplier;
    }

    if (orderBy === "lastPrice") {
      const aVisualMultiplier = BigInt(a.visualMultiplier ?? 1);
      const bVisualMultiplier = BigInt(b.visualMultiplier ?? 1);

      let aMidPrice = tokensData?.[aAddress]?.prices ? getMidPrice(tokensData[aAddress].prices) : 0n;
      aMidPrice *= aVisualMultiplier;
      let bMidPrice = tokensData?.[bAddress]?.prices ? getMidPrice(tokensData[bAddress].prices) : 0n;
      bMidPrice *= bVisualMultiplier;

      return aMidPrice > bMidPrice ? directionMultiplier : -directionMultiplier;
    }

    if (orderBy === "24hChange") {
      // Price delta map uses native addresses
      const aChange = dayPriceDeltaMap?.[a.address]?.deltaPercentage || 0;
      const bChange = dayPriceDeltaMap?.[b.address]?.deltaPercentage || 0;
      return aChange > bChange ? directionMultiplier : -directionMultiplier;
    }

    if (orderBy === "combinedAvailableLiquidity") {
      const { maxLongLiquidityPool: aLongLiq, maxShortLiquidityPool: aShortLiq } = getMaxLongShortLiquidityPool(a);
      const { maxLongLiquidityPool: bLongLiq, maxShortLiquidityPool: bShortLiq } = getMaxLongShortLiquidityPool(b);

      const aTotalLiq = aLongLiq.maxLongLiquidity + aShortLiq.maxShortLiquidity;
      const bTotalLiq = bLongLiq.maxLongLiquidity + bShortLiq.maxShortLiquidity;
      return aTotalLiq > bTotalLiq ? directionMultiplier : -directionMultiplier;
    }

    if (orderBy === "combinedOpenInterest") {
      const aOI =
        (indexTokenStatsMap?.[aAddress]?.totalOpenInterestLong || 0n) +
        (indexTokenStatsMap?.[aAddress]?.totalOpenInterestShort || 0n);
      const bOI =
        (indexTokenStatsMap?.[bAddress]?.totalOpenInterestLong || 0n) +
        (indexTokenStatsMap?.[bAddress]?.totalOpenInterestShort || 0n);
      return aOI > bOI ? directionMultiplier : -directionMultiplier;
    }

    return 0;
  };
}
