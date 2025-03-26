import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import partition from "lodash/partition";
import React, { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";
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
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { IndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { PriceDelta, PriceDeltaMap, TokenData, TokensData, use24hPriceDeltaMap } from "domain/synthetics/tokens";
import { use24hVolumes } from "domain/synthetics/tokens/use24Volumes";
import { TradeType } from "domain/synthetics/trade";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";
import { stripBlacklistedWords, type Token } from "domain/tokens";
import { getMidPrice } from "domain/tokens/utils";
import { formatAmountHuman, formatUsdPrice } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { searchBy } from "lib/searchBy";
import {
  convertTokenAddress,
  getCategoryTokenAddresses,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "sdk/configs/tokens";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";

import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  oneRowLabels?: boolean;
};

export default function ChartTokenSelector(props: Props) {
  const { selectedToken, oneRowLabels } = props;

  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);
  const poolName = marketInfo && !isSwap ? getMarketPoolName(marketInfo) : null;

  const chevronClassName = oneRowLabels === undefined ? undefined : oneRowLabels ? "!-mt-4" : "!-mt-1 self-start";

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      popoverYOffset={16}
      popoverXOffset={-8}
      handleClassName={cx("group", { "mr-24": oneRowLabels === false })}
      chevronClassName={chevronClassName}
      desktopPanelClassName="w-[880px] max-w-[100vw]"
      label={
        selectedToken ? (
          <span
            className={cx("inline-flex whitespace-nowrap pl-0 text-[20px] font-bold", {
              "items-start": !oneRowLabels,
              "items-center": oneRowLabels,
            })}
          >
            <TokenIcon className="mr-8 mt-2" symbol={selectedToken.symbol} displaySize={20} importSize={24} />
            <span
              className={cx("flex justify-start", {
                "flex-col": !oneRowLabels,
                "flex-row items-center": oneRowLabels,
              })}
            >
              <span className="text-body-large">
                {!isSwap && <>{getTokenVisualMultiplier(selectedToken)}</>}
                {selectedToken.symbol}/USD
              </span>
              {poolName && (
                <span
                  className={cx("text-body-small font-normal text-slate-100 group-hover:text-blue-300", {
                    "ml-8": oneRowLabels,
                  })}
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

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isSmallMobile = useMedia("(max-width: 450px)");

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

  const rowVerticalPadding = cx({
    "group-last-of-type/row:pb-8": !isMobile,
    "h-50": !isMobile && !isSwap,
    "py-4": (!isMobile && isSwap) || (isMobile && !isSwap),
    "py-8": isMobile && isSwap,
  });
  const rowHorizontalPadding = isMobile
    ? cx("px-2 first-of-type:pl-5 last-of-type:pr-8")
    : cx("px-5 first-of-type:pl-16 last-of-type:pr-16");
  const thClassName = cx(
    "text-body-medium sticky top-0 z-10 whitespace-nowrap border-b border-slate-700 bg-slate-800 text-left font-normal uppercase text-slate-100",
    "first-of-type:text-left",
    isMobile ? "first-of-type:!pl-40" : "first-of-type:!pl-37",
    rowVerticalPadding,
    rowHorizontalPadding
  );

  const tdClassName = cx(
    "text-body-medium",
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
        <div className="flex flex-col gap-8">
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
      </SelectorBaseMobileHeaderContent>

      {!isMobile && (
        <>
          <div className="m-16 flex justify-between gap-16">
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
        </>
      )}

      <div
        className={cx({
          "max-h-[444px] overflow-x-auto": !isMobile,
        })}
      >
        <table className="text-sm w-full border-separate border-spacing-0">
          <thead className="bg-slate-800">
            <tr>
              <th className={cx(thClassName, isMobile ? "min-w-[18ch]" : "min-w-[28ch]")} colSpan={2}>
                <Trans>Market</Trans>
              </th>
              {!isSwap && (
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
                    <th className={thClassName} colSpan={2}>
                      <Sorter {...getSorterProps("combinedOpenInterest")}>
                        <Trans>OPEN INTEREST</Trans>
                      </Sorter>
                    </th>
                  )}
                  <th className={thClassName} colSpan={2}>
                    <Sorter {...getSorterProps("combinedAvailableLiquidity")}>{availableLiquidityLabel}</Sorter>
                  </th>
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
            {options && options.length > 0 && !sortedTokens?.length && (
              <TableTr hoverable={false} bordered={false}>
                <TableTd colSpan={isSwap ? 2 : 3} className="text-body-medium text-slate-100">
                  <Trans>No markets matched.</Trans>
                </TableTd>
              </TableTr>
            )}
          </tbody>
        </table>
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
        className={cx({
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
      <tr key={token.symbol} className="group/row cursor-pointer hover:bg-cold-blue-900">
        <td className={cx("pl-9 pr-9 text-center", rowVerticalPadding)} onClick={handleFavoriteClick}>
          <FavoriteStar isFavorite={isFavorite} />
        </td>
        <td
          className={cx("text-body-medium w-full", rowVerticalPadding, rowHorizontalPadding)}
          onClick={handleSelectLargePosition}
        >
          <span className="inline-flex items-center text-slate-100">
            <TokenIcon
              className="ChartToken-list-icon -my-5 mr-8"
              symbol={token.symbol}
              displaySize={16}
              importSize={24}
            />
            {token.symbol}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr
      key={token.symbol}
      className="group/row cursor-pointer hover:bg-cold-blue-900"
      onClick={handleSelectLargePosition}
    >
      <td
        className={cx("text-center", rowVerticalPadding, isMobile ? "pl-10 pr-4 pt-6 align-top" : "px-9 text-center")}
        onClick={handleFavoriteClick}
      >
        <FavoriteStar isFavorite={isFavorite} />
      </td>
      <td className={cx("text-body-medium pl-4", rowVerticalPadding, isMobile ? "pr-2" : "pr-8")}>
        <div className={cx("flex", isMobile ? "items-start" : "items-center")}>
          <TokenIcon className="ChartToken-list-icon mr-8" symbol={token.symbol} displaySize={16} importSize={24} />
          <span className={cx("flex flex-wrap gap-4", isMobile ? "flex-col items-start" : "items-center")}>
            <span className="-mt-2 leading-1">{getMarketIndexName({ indexToken: token, isSpotOnly: false })}</span>
            <span className="rounded-4 bg-slate-700 px-4 pb-5 pt-3 leading-1">
              {maxLeverage ? `${maxLeverage}x` : "-"}
            </span>
          </span>
        </div>
      </td>

      <td className={tdClassName}>
        <div className="flex flex-col gap-4">
          <span>
            {tokenData
              ? formatUsdPrice(getMidPrice(tokenData.prices), { visualMultiplier: tokenData.visualMultiplier })
              : "-"}
          </span>
          {isMobile && <span>{dayPriceDeltaComponent}</span>}
        </div>
      </td>
      {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      <td className={tdClassName}>{dayVolume ? formatAmountHuman(dayVolume, USD_DECIMALS, true) : "-"}</td>
      {!isMobile && (
        <>
          <td className={tdClassName}>
            <span className="inline-flex items-center gap-4">
              <LongIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(openInterestLong ?? 0n, USD_DECIMALS, true)}
            </span>
          </td>
          <td className={tdClassName}>
            <span className="inline-flex items-center gap-4">
              <ShortIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(openInterestShort ?? 0n, USD_DECIMALS, true)}
            </span>
          </td>
        </>
      )}

      {!isMobile ? (
        <>
          <td className={cx(tdClassName, "group hover:bg-cold-blue-700")} onClick={handleSelectLong}>
            <div className="inline-flex items-center justify-end gap-4">
              <LongIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(maxLongLiquidityPool?.maxLongLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
          <td className={cx(tdClassName, "group hover:bg-cold-blue-700")} onClick={handleSelectShort}>
            <div className="inline-flex items-center justify-end gap-4">
              <ShortIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(maxShortLiquidityPool?.maxShortLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
        </>
      ) : (
        <td colSpan={2} className={cx(tdClassName)}>
          <div className="flex items-center justify-end gap-4">
            <LongIcon width={12} className="relative top-1 opacity-70" />
            {formatAmountHuman(maxLongLiquidityPool?.maxLongLiquidity, USD_DECIMALS, true)}
          </div>
          <div className="flex items-center justify-end gap-4">
            <ShortIcon width={12} className="relative top-1 opacity-70" />
            {formatAmountHuman(maxShortLiquidityPool?.maxShortLiquidity, USD_DECIMALS, true)}
          </div>
        </td>
      )}
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
