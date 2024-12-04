import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";
import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import {
  convertTokenAddress,
  getCategoryTokenAddresses,
  getTokenVisualMultiplier,
  isChartAvailableForToken,
} from "config/tokens";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectAvailableChartTokens } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectIndexTokenStatsMap } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxChooseSuitableMarket,
  selectTradeboxGetMaxLongShortLiquidityPool,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { IndexTokensStats } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { PriceDelta, PriceDeltaMap, TokenData, TokensData, use24hPriceDeltaMap } from "domain/synthetics/tokens";
import { use24hVolumes } from "domain/synthetics/tokens/use24Volumes";
import { TokenFavoritesTabOption, useTokensFavorites } from "domain/synthetics/tokens/useTokensFavorites";
import { TradeType } from "domain/synthetics/trade";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";
import { stripBlacklistedWords, type Token } from "domain/tokens";
import { getMidPrice } from "domain/tokens/utils";

import { helperToast } from "lib/helperToast";
import { formatAmountHuman, formatUsdPrice } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { SortDirection, Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";

import "./ChartTokenSelector.scss";

type Props = {
  selectedToken: Token | undefined;
  oneRowLabels?: boolean;
};

export default function ChartTokenSelector(props: Props) {
  const { selectedToken, oneRowLabels } = props;

  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);
  const poolName = marketInfo && !isSwap ? getMarketPoolName(marketInfo) : null;

  const chevronClassName = oneRowLabels === undefined ? undefined : oneRowLabels ? "mt-4" : "mt-2 self-start";

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      popoverYOffset={16}
      popoverXOffset={-8}
      handleClassName={oneRowLabels === false ? "mr-24" : undefined}
      chevronClassName={chevronClassName}
      label={
        selectedToken ? (
          <span
            className={cx("inline-flex whitespace-nowrap pl-0 text-[20px] font-bold", {
              "items-start": !oneRowLabels,
              "items-center": oneRowLabels,
            })}
          >
            <TokenIcon className="mr-8 mt-4" symbol={selectedToken.symbol} displaySize={20} importSize={24} />
            <span
              className={cx("flex justify-start", {
                "flex-col": !oneRowLabels,
                "flex-row items-center": oneRowLabels,
              })}
            >
              <span className="text-body-large">
                {!isSwap && <>{getTokenVisualMultiplier(selectedToken)}</>}
                {selectedToken.symbol} / USD
              </span>
              {poolName && (
                <span
                  className={cx("text-body-small font-normal text-gray-300", {
                    "ml-8": oneRowLabels,
                  })}
                >
                  [{poolName}]
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
  | "marketVolume"
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
  const dayVolumes = use24hVolumes(availableChartTokenAddresses);
  const indexTokenStatsMap = useSelector(selectIndexTokenStatsMap).indexMap;

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  const close = useSelectorClose();

  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchKeyword, setSearchKeyword] = useState("");
  const isSwap = tradeType === TradeType.Swap;

  const sortedTokens = useFilterSortTokens({
    chainId,
    options,
    searchKeyword,
    tab,
    isSwap,
    favoriteTokens,
    direction,
    orderBy,
    tokensData: tokensData,
    dayPriceDeltaMap,
    dayVolumes,
    indexTokenStatsMap,
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

  const marketsInfoData = useMarketsInfoData();

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
      close();

      const chosenMarket = chooseSuitableMarket(tokenAddress, preferredTradeType, tradeType);

      if (chosenMarket?.marketTokenAddress && chosenMarket.tradeType !== TradeType.Swap) {
        const marketInfo = getByKey(marketsInfoData, chosenMarket.marketTokenAddress);
        const nextTradeType = chosenMarket.tradeType;
        if (marketInfo) {
          const indexName = getMarketIndexName(marketInfo);
          const poolName = getMarketPoolName(marketInfo);

          helperToast.success(
            <Trans>
              <span>{nextTradeType === TradeType.Long ? t`Long` : t`Short`}</span>{" "}
              <div className="inline-flex">
                <span>{indexName}</span>
                <span className="subtext gm-toast leading-1">[{poolName}]</span>
              </div>{" "}
              <span>market selected</span>
            </Trans>
          );
        }
      }
    },
    [chooseSuitableMarket, close, marketsInfoData, tradeType]
  );

  const rowVerticalPadding = isMobile ? "py-4" : cx("h-50 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isMobile
    ? cx("px-6 first-of-type:pl-8 last-of-type:pr-8")
    : cx("px-5 first-of-type:pl-16 last-of-type:pr-16");
  const thClassName = cx(
    "text-body-medium sticky top-0 z-10 border-b border-slate-700 bg-slate-800 text-left font-normal uppercase text-gray-400",
    "first-of-type:text-left last-of-type:[&:not(:first-of-type)]:text-right",
    isMobile ? "first-of-type:!pl-40" : "first-of-type:!pl-37",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx("text-body-medium last-of-type:text-right", rowVerticalPadding, rowHorizontalPadding);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && sortedTokens && sortedTokens.length > 0) {
        const token = sortedTokens[0];
        handleMarketSelect(token.address);
      }
    },
    [sortedTokens, handleMarketSelect]
  );

  return (
    <>
      <SelectorBaseMobileHeaderContent>
        <div className="mt-16 flex flex-col gap-8">
          <SearchInput
            className="w-full *:!text-body-medium"
            value={searchKeyword}
            setValue={setSearchKeyword}
            onKeyDown={handleKeyDown}
          />
          {!isSwap && (
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs favoritesKey="chart-token-selector" />
            </ButtonRowScrollFadeContainer>
          )}
        </div>
      </SelectorBaseMobileHeaderContent>
      <div className="Synths-ChartTokenSelector">
        {!isMobile && (
          <>
            <div className="m-16 flex justify-between gap-16">
              <SearchInput
                className="w-full *:!text-body-medium"
                value={searchKeyword}
                setValue={setSearchKeyword}
                onKeyDown={handleKeyDown}
              />
              <FavoriteTabs favoritesKey="chart-token-selector" />
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
                <th className={thClassName} colSpan={2}>
                  <Sorter {...getSorterProps("marketVolume")}>
                    <Trans>Market</Trans>
                  </Sorter>
                </th>
                {!isSwap && (
                  <>
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("lastPrice")}>
                        <Trans>LAST PRICE</Trans>
                      </Sorter>
                    </th>
                    {!isMobile && (
                      <>
                        <th className={thClassName}>
                          <Sorter {...getSorterProps("24hChange")}>
                            <Trans>24H%</Trans>
                          </Sorter>
                        </th>
                        <th className={thClassName}>
                          <Sorter {...getSorterProps("24hVolume")}>
                            <Trans>24H VOL.</Trans>
                          </Sorter>
                        </th>
                        <th className={thClassName}>
                          <Sorter {...getSorterProps("combinedOpenInterest")}>
                            <Trans>OPEN INTEREST</Trans>
                          </Sorter>
                        </th>
                      </>
                    )}
                    <th className={thClassName} colSpan={2}>
                      <Sorter {...getSorterProps("combinedAvailableLiquidity")}>
                        <Trans>AVAILABLE LIQ.</Trans>
                      </Sorter>
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
                  <TableTd colSpan={isSwap ? 2 : 3} className="text-body-medium text-gray-400">
                    <Trans>No markets matched.</Trans>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function useFilterSortTokens({
  chainId,
  options,
  searchKeyword,
  tab,
  isSwap,
  favoriteTokens,
  direction,
  orderBy,
  tokensData,
  dayPriceDeltaMap,
  dayVolumes,
  indexTokenStatsMap,
}: {
  chainId: number;
  options: Token[] | undefined;
  searchKeyword: string;
  tab: TokenFavoritesTabOption;
  isSwap: boolean;
  favoriteTokens: string[];
  direction: SortDirection;
  orderBy: SortField;
  tokensData: TokensData | undefined;
  dayPriceDeltaMap: PriceDeltaMap | undefined;
  dayVolumes: Record<Address, bigint> | undefined;
  indexTokenStatsMap: Partial<IndexTokensStats> | undefined;
}) {
  const filteredTokens: Token[] | undefined = useMemo(() => {
    const textMatched =
      searchKeyword.trim() && options
        ? searchBy(
            options,
            [(item) => stripBlacklistedWords(item.name), (item) => `${getTokenVisualMultiplier(item)}${item.symbol}`],
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
  }, [chainId, favoriteTokens, options, searchKeyword, tab]);

  const getMaxLongShortLiquidityPool = useSelector(selectTradeboxGetMaxLongShortLiquidityPool);

  const sortedTokens = useMemo(() => {
    if (isSwap || orderBy === "unspecified" || direction === "unspecified") {
      return filteredTokens;
    }

    const directionMultiplier = direction === "asc" ? 1 : -1;

    return filteredTokens?.slice().sort((a, b) => {
      if (orderBy === "marketVolume") {
        // they are by default sorted by market volume so we just pass directionMultiplier
        return directionMultiplier;
      }

      if (orderBy === "lastPrice") {
        const aMidPrice = tokensData?.[a.address]?.prices ? getMidPrice(tokensData[a.address].prices) : 0n;
        const bMidPrice = tokensData?.[b.address]?.prices ? getMidPrice(tokensData[b.address].prices) : 0n;
        return aMidPrice > bMidPrice ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "24hChange") {
        const aChange = dayPriceDeltaMap?.[a.address]?.deltaPercentage || 0;
        const bChange = dayPriceDeltaMap?.[b.address]?.deltaPercentage || 0;
        return aChange > bChange ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "24hVolume") {
        const aVolume = dayVolumes?.[a.address] || 0n;
        const bVolume = dayVolumes?.[b.address] || 0n;
        return aVolume > bVolume ? directionMultiplier : -directionMultiplier;
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
          (indexTokenStatsMap?.[a.address]?.totalOpenInterestLong || 0n) +
          (indexTokenStatsMap?.[a.address]?.totalOpenInterestShort || 0n);
        const bOI =
          (indexTokenStatsMap?.[b.address]?.totalOpenInterestLong || 0n) +
          (indexTokenStatsMap?.[b.address]?.totalOpenInterestShort || 0n);
        return aOI > bOI ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [
    isSwap,
    direction,
    filteredTokens,
    getMaxLongShortLiquidityPool,
    orderBy,
    tokensData,
    dayPriceDeltaMap,
    dayVolumes,
    indexTokenStatsMap,
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
      <tr key={token.symbol} className="group/row">
        <td
          className={cx("rounded-4 pl-16 pr-4 text-center hover:bg-cold-blue-900", rowVerticalPadding)}
          onClick={handleFavoriteClick}
        >
          <FavoriteStar isFavorite={isFavorite} />
        </td>
        <td
          className={cx(
            "text-body-medium w-full rounded-4 hover:bg-cold-blue-900",
            rowVerticalPadding,
            rowHorizontalPadding
          )}
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
      className="ChartTokenSelector-hover-row group/row cursor-pointer"
      onClick={handleSelectLargePosition}
    >
      <td
        className={cx(
          "ChartTokenSelector-td-custom-hover-flag",
          "pr-4 text-center hover:bg-cold-blue-900",
          rowVerticalPadding,
          isMobile ? "pl-8" : "pl-16"
        )}
        onClick={handleFavoriteClick}
      >
        <FavoriteStar isFavorite={isFavorite} />
      </td>
      <td className={cx("text-body-medium pl-4", rowVerticalPadding, isMobile ? "pr-6" : "pr-8")}>
        <div className="flex items-center">
          <TokenIcon
            className="ChartToken-list-icon -my-5 mr-8"
            symbol={token.symbol}
            displaySize={16}
            importSize={24}
          />
          <span className="flex flex-wrap items-center gap-4">
            <span className="-mt-2 leading-1">{getMarketIndexName({ indexToken: token, isSpotOnly: false })}</span>
            <span className="text-body-small rounded-2 bg-slate-700 px-2 pb-3 pt-1 leading-1">
              {maxLeverage ? `${maxLeverage}x` : "-"}
            </span>
          </span>
        </div>
      </td>

      <td className={tdClassName}>
        <div className="flex flex-col gap-4">
          <span>{tokenData ? formatUsdPrice(getMidPrice(tokenData.prices)) : "-"}</span>
          {isMobile && <span>{dayPriceDeltaComponent}</span>}
        </div>
      </td>
      {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      {!isMobile && (
        <td className={tdClassName}>{dayVolume ? formatAmountHuman(dayVolume, USD_DECIMALS, true) : "-"}</td>
      )}
      {!isMobile && (
        <td className={tdClassName}>
          {formatAmountHuman(openInterestLong ?? 0n, USD_DECIMALS, true)} /{" "}
          {formatAmountHuman(openInterestShort ?? 0n, USD_DECIMALS, true)}
        </td>
      )}
      {!isMobile ? (
        <>
          <td
            className={cx(
              tdClassName,
              "ChartTokenSelector-td-custom-hover-flag",
              "bg-slate-800 hover:bg-cold-blue-900"
            )}
            onClick={handleSelectLong}
          >
            <div className="flex items-center justify-end gap-4">
              <LongIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(maxLongLiquidityPool?.maxLongLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
          <td
            className={cx(
              tdClassName,
              "ChartTokenSelector-td-custom-hover-flag",
              "bg-slate-800 hover:bg-cold-blue-900"
            )}
            onClick={handleSelectShort}
          >
            <div className="flex items-center justify-end gap-4">
              <ShortIcon width={12} className="relative top-1 opacity-70" />
              {formatAmountHuman(maxShortLiquidityPool?.maxShortLiquidity, USD_DECIMALS, true)}
            </div>
          </td>
        </>
      ) : (
        <td
          colSpan={2}
          className={cx(tdClassName, "ChartTokenSelector-td-custom-hover-flag", "bg-slate-800 hover:bg-cold-blue-900")}
          onClick={handleSelectLong}
        >
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
