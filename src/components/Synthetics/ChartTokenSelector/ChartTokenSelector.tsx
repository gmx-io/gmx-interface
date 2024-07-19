import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxChooseSuitableMarket,
  useTradeboxGetMaxLongShortLiquidityPool,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectTradeboxTradeType } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import {
  indexTokensFavoritesTabOptionLabels,
  indexTokensFavoritesTabOptions,
  useIndexTokensFavorites,
} from "domain/synthetics/tokens/useIndexTokensFavorites";
import { TradeType } from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmountHuman, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import SearchInput from "components/SearchInput/SearchInput";
import { SortDirection, Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  options: Token[] | undefined;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken } = props;

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      popoverYOffset={16}
      popoverXOffset={-12}
      label={
        selectedToken ? (
          <span className="inline-flex items-center py-5 pl-5 text-[20px] font-bold max-[380px]:text-16">
            <TokenIcon className="mr-8" symbol={selectedToken.symbol} displaySize={20} importSize={24} />
            {selectedToken.symbol} {"/ USD"}
          </span>
        ) : (
          "..."
        )
      }
      modalLabel={t`Market`}
      mobileModalContentPadding={false}
    >
      <MarketsList options={options} />
    </SelectorBase>
  );
}

type SortField = "longLiquidity" | "shortLiquidity" | "unspecified";

function MarketsList(props: { options: Token[] | undefined }) {
  const { options } = props;
  const { tab, setTab, favoriteTokens, setFavoriteTokens } = useIndexTokensFavorites();

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isSmallMobile = useMedia("(max-width: 450px)");

  const close = useSelectorClose();

  const tradeType = useSelector(selectTradeboxTradeType);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchKeyword, setSearchKeyword] = useState("");
  const isSwap = tradeType === TradeType.Swap;

  const sortedTokens = useFilterSortTokens({ options, searchKeyword, tab, isSwap, favoriteTokens, direction, orderBy });

  const chooseSuitableMarket = useTradeboxChooseSuitableMarket();
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

  const rowVerticalPadding = isMobile ? "py-8" : cx("py-4 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isSmallMobile ? cx("px-6 first-of-type:pl-15 last-of-type:pr-15") : "px-15";
  const thClassName = cx(
    "sticky top-0 bg-slate-800 text-left font-normal uppercase text-gray-400 first-of-type:text-left last-of-type:[&:not(:first-of-type)]:text-right",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx(
    "cursor-pointer rounded-4 last-of-type:text-right hover:bg-cold-blue-900",
    rowVerticalPadding,
    rowHorizontalPadding
  );

  const localizedTabOptionLabels = useLocalizedMap(indexTokensFavoritesTabOptionLabels);

  const handleSetValue = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
    },
    [setSearchKeyword]
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

  const handleFavoriteClick = useCallback(
    (address: string) => {
      if (favoriteTokens?.includes(address)) {
        setFavoriteTokens((favoriteTokens || []).filter((item) => item !== address));
      } else {
        setFavoriteTokens([...(favoriteTokens || []), address]);
      }
    },
    [favoriteTokens, setFavoriteTokens]
  );

  return (
    <>
      <SelectorBaseMobileHeaderContent>
        <SearchInput className="mt-15" value={searchKeyword} setValue={handleSetValue} onKeyDown={handleKeyDown} />
      </SelectorBaseMobileHeaderContent>
      <div
        className={cx("Synths-ChartTokenSelector", {
          "w-[448px]": !isMobile && !isSwap,
        })}
      >
        {!isMobile && (
          <>
            <SearchInput className="m-15" value={searchKeyword} setValue={handleSetValue} onKeyDown={handleKeyDown} />
            <div className="divider" />
          </>
        )}
        {!isSwap && (
          <Tab
            className="px-15 py-4"
            options={indexTokensFavoritesTabOptions}
            optionLabels={localizedTabOptionLabels}
            type="inline"
            option={tab}
            setOption={setTab}
          />
        )}

        <div
          className={cx({
            "max-h-svh overflow-x-auto": !isMobile,
          })}
        >
          <table className={cx("text-sm w-full")}>
            <thead className="bg-slate-800">
              <tr>
                <th className={thClassName} colSpan={isSwap ? 1 : 2}>
                  <Trans>Market</Trans>
                </th>
                {!isSwap && (
                  <>
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("longLiquidity")}>
                        <Trans>LONG LIQ.</Trans>
                      </Sorter>
                    </th>
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("shortLiquidity")}>
                        <Trans>SHORT LIQ.</Trans>
                      </Sorter>
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {sortedTokens?.map((token) => (
                <MarketListItem
                  key={token.address}
                  token={token}
                  isSwap={isSwap}
                  isSmallMobile={isSmallMobile}
                  isFavorite={favoriteTokens?.includes(token.address)}
                  onFavorite={handleFavoriteClick}
                  rowVerticalPadding={rowVerticalPadding}
                  rowHorizontalPadding={rowHorizontalPadding}
                  tdClassName={tdClassName}
                  onMarketSelect={handleMarketSelect}
                />
              ))}
            </tbody>
          </table>
          {options && options.length > 0 && !sortedTokens?.length && (
            <div className="py-15 text-center text-gray-400">
              <Trans>No markets matched.</Trans>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function useFilterSortTokens({
  options,
  searchKeyword,
  tab,
  isSwap,
  favoriteTokens,
  direction,
  orderBy,
}: {
  options: Token[] | undefined;
  searchKeyword: string;
  tab: string;
  isSwap: boolean;
  favoriteTokens: string[];
  direction: SortDirection;
  orderBy: SortField;
}) {
  const filteredTokens: Token[] | undefined = useMemo(
    () =>
      options?.filter((item) => {
        let textSearchMatch = false;
        if (!searchKeyword.trim()) {
          textSearchMatch = true;
        } else {
          textSearchMatch =
            item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            item.symbol.toLowerCase().includes(searchKeyword.toLowerCase());
        }

        const favoriteMatch = tab === "favorites" && !isSwap ? favoriteTokens?.includes(item.address) : true;

        return textSearchMatch && favoriteMatch;
      }),
    [favoriteTokens, isSwap, options, searchKeyword, tab]
  );

  const getMaxLongShortLiquidityPool = useTradeboxGetMaxLongShortLiquidityPool();

  const sortedTokens = useMemo(() => {
    if (isSwap || orderBy === "unspecified" || direction === "unspecified") {
      return filteredTokens;
    }

    const directionMultiplier = direction === "asc" ? 1 : -1;

    return filteredTokens?.slice().sort((a, b) => {
      const { maxLongLiquidityPool: aLongLiq, maxShortLiquidityPool: aShortLiq } = getMaxLongShortLiquidityPool(a);
      const { maxLongLiquidityPool: bLongLiq, maxShortLiquidityPool: bShortLiq } = getMaxLongShortLiquidityPool(b);

      if (orderBy === "longLiquidity") {
        const aLongLiquidity = aLongLiq?.maxLongLiquidity || 0n;
        const bLongLiquidity = bLongLiq?.maxLongLiquidity || 0n;

        return aLongLiquidity > bLongLiquidity ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "shortLiquidity") {
        const aShortLiquidity = aShortLiq?.maxShortLiquidity || 0n;
        const bShortLiquidity = bShortLiq?.maxShortLiquidity || 0n;

        return aShortLiquidity > bShortLiquidity ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [isSwap, direction, filteredTokens, getMaxLongShortLiquidityPool, orderBy]);

  return sortedTokens;
}

function MarketListItem({
  token,
  isSwap,
  isSmallMobile,
  isFavorite,
  onFavorite,
  rowVerticalPadding,
  rowHorizontalPadding,
  tdClassName,
  onMarketSelect,
}: {
  token: Token;
  isSwap: boolean;
  isSmallMobile: boolean;
  isFavorite?: boolean;
  onFavorite: (address: string) => void;
  rowVerticalPadding: string;
  rowHorizontalPadding: string;
  tdClassName: string;
  onMarketSelect: (address: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => void;
}) {
  const getMaxLongShortLiquidityPool = useTradeboxGetMaxLongShortLiquidityPool();

  const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

  let formattedMaxLongLiquidity = formatUsdWithMobile(!isSwap && maxLongLiquidityPool?.maxLongLiquidity, isSmallMobile);

  let maxShortLiquidityPoolFormatted = formatUsdWithMobile(
    !isSwap && maxShortLiquidityPool?.maxShortLiquidity,
    isSmallMobile
  );

  const handleFavoriteClick = useCallback(() => {
    onFavorite(token.address);
  }, [onFavorite, token.address]);

  const handleSelectLargePosition = useCallback(() => {
    onMarketSelect(token.address, "largestPosition");
  }, [onMarketSelect, token.address]);

  const handleSelectLong = useCallback(() => {
    onMarketSelect(token.address, TradeType.Long);
  }, [onMarketSelect, token.address]);

  const handleSelectShort = useCallback(() => {
    onMarketSelect(token.address, TradeType.Short);
  }, [onMarketSelect, token.address]);

  if (isSwap) {
    return (
      <tr key={token.symbol} className="group/row">
        <td
          className={cx(
            "w-full cursor-pointer rounded-4 hover:bg-cold-blue-900",
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
    <tr key={token.symbol} className="group/row">
      <td
        className={cx("cursor-pointer rounded-4 pl-15 pr-4 text-center hover:bg-cold-blue-900", rowVerticalPadding)}
        onClick={handleFavoriteClick}
      >
        <FavoriteStar isFavorite={isFavorite} />
      </td>
      <td
        className={cx(
          "cursor-pointer rounded-4 pl-6 hover:bg-cold-blue-900",
          rowVerticalPadding,
          isSmallMobile ? "pr-6" : "pr-15"
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
          {token.symbol} {!isSwap && "/ USD"}
        </span>
      </td>

      <td className={tdClassName} onClick={handleSelectLong}>
        {formattedMaxLongLiquidity}
      </td>
      <td className={tdClassName} onClick={handleSelectShort}>
        {maxShortLiquidityPoolFormatted}
      </td>
    </tr>
  );
}

function formatUsdWithMobile(amount: bigint | undefined | false, isSmallMobile: boolean) {
  if (amount === undefined || amount === false) {
    return "";
  }

  if (isSmallMobile) {
    return formatAmountHuman(amount, USD_DECIMALS, true);
  }

  return formatUsd(amount)!;
}
