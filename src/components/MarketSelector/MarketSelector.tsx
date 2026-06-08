import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useMemo, useState } from "react";

import {
  SubCategoryTab,
  cryptoSubCategoryOptions,
  subCategoryTabLabels,
  tradfiSubCategoryOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { MarketInfo, getMarketIndexName } from "domain/synthetics/markets";
import { useMarketsListingDates } from "domain/synthetics/markets/useMarketsListingDates";
import { TokenData, TokensData, convertToUsd } from "domain/synthetics/tokens";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { useLocalizedMap } from "lib/i18n";
import { importImage } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TokenCategory } from "sdk/utils/tokens/types";

import Button from "components/Button/Button";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { getRecentlyListedTokenAddresses } from "../ChartTokenSelector/marketFilters";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

import "./MarketSelector.scss";

const CRYPTO_CATEGORIES: TokenCategory[] = ["ai", "layer1", "layer2", "defi", "meme"];
const TRADFI_SUB_CATEGORIES: TokenCategory[] = ["pre-ipo", "commodities", "stocks", "indices", "fx"];

type Props = {
  chainId: number;
  label?: string;
  className?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  selectedMarketLabel?: ReactNode | string;
  isSideMenu?: boolean;
  missedCoinsPlace?: MissedCoinsPlace;
  footerContent?: ReactNode;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (indexName: string, market: MarketInfo) => void;
};

type MarketState = {
  disabled?: boolean;
  message?: string;
};

type MarketOption = {
  indexName: string;
  marketInfo: MarketInfo;
  balance: bigint;
  balanceUsd: bigint;
  state?: MarketState;
};

export function MarketSelector({
  chainId,
  selectedIndexName,
  className,
  selectedMarketLabel,
  label,
  markets,
  isSideMenu,
  marketTokensData,
  showBalances,
  footerContent,
  missedCoinsPlace,
  onSelectMarket,
  getMarketState,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const {
    topLevelTab: storedTopLevelTab,
    subCategoryTab: storedSubCategoryTab,
    setSubCategoryTab,
    favoriteTokens,
    toggleFavoriteToken,
  } = useTokensFavorites("market-selector");
  const localizedSubCategoryLabels = useLocalizedMap(subCategoryTabLabels);
  const { listingDateByIndexToken } = useMarketsListingDates(chainId as ContractsChainId);

  const recentlyListedAddressesSet = useMemo(
    () => new Set(getRecentlyListedTokenAddresses(listingDateByIndexToken, Date.now())),
    [listingDateByIndexToken]
  );

  const marketsOptions: MarketOption[] = useMemo(() => {
    const optionsByIndexName: { [indexName: string]: MarketOption } = {};

    markets
      .filter((market) => !market.isDisabled)
      .forEach((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);

        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(marketInfo);

        const option = optionsByIndexName[indexName];

        if (option) {
          option.balance = option.balance + (gmBalance ?? 0n);
          option.balanceUsd = option.balanceUsd + (gmBalanceUsd ?? 0n);
        }

        optionsByIndexName[indexName] = optionsByIndexName[indexName] || {
          indexName,
          marketInfo,
          balance: gmBalance ?? 0n,
          balanceUsd: gmBalanceUsd ?? 0n,
          state,
        };
      });

    return Object.values(optionsByIndexName);
  }, [getMarketState, marketTokensData, markets]);

  const marketInfo = marketsOptions.find((option) => option.indexName === selectedIndexName)?.marketInfo;

  const recentlyListedCount = useMemo(() => {
    if (recentlyListedAddressesSet.size === 0) return 0;
    return marketsOptions.filter((option) =>
      recentlyListedAddressesSet.has(option.marketInfo.indexTokenAddress.toLowerCase())
    ).length;
  }, [marketsOptions, recentlyListedAddressesSet]);

  const topLevelTab = storedTopLevelTab === "recently-listed" && recentlyListedCount === 0 ? "all" : storedTopLevelTab;

  const populatedCryptoSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    for (const cat of CRYPTO_CATEGORIES) {
      if (marketsOptions.some((option) => option.marketInfo.indexToken.categories?.includes(cat))) {
        set.add(cat as SubCategoryTab);
      }
    }
    return set;
  }, [marketsOptions]);

  const populatedTradfiSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    for (const cat of TRADFI_SUB_CATEGORIES) {
      if (marketsOptions.some((option) => option.marketInfo.indexToken.categories?.includes(cat))) {
        set.add(cat as SubCategoryTab);
      }
    }
    return set;
  }, [marketsOptions]);

  const subCategoryTab =
    storedSubCategoryTab === "all" ||
    (topLevelTab === "crypto" && populatedCryptoSubCats.has(storedSubCategoryTab)) ||
    (topLevelTab === "tradfi" && populatedTradfiSubCats.has(storedSubCategoryTab))
      ? storedSubCategoryTab
      : "all";

  const cryptoSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      cryptoSubCategoryOptions
        .filter((opt) => opt === "all" || populatedCryptoSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [localizedSubCategoryLabels, populatedCryptoSubCats]
  );

  const tradfiSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      tradfiSubCategoryOptions
        .filter((opt) => opt === "all" || populatedTradfiSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [localizedSubCategoryLabels, populatedTradfiSubCats]
  );

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            "indexName",
            (item) => (item.marketInfo.isSpotOnly ? "" : stripBlacklistedWords(item.marketInfo.indexToken.name)),
            (item) => (item.marketInfo.isSpotOnly ? "" : (item.marketInfo.indexToken.searchAliases ?? []).join(" ")),
          ],
          searchKeyword
        )
      : marketsOptions;

    const topLevelFiltered = (() => {
      switch (topLevelTab) {
        case "all":
          return textMatched;
        case "favorites":
          return textMatched?.filter((item) => favoriteTokens?.includes(item.marketInfo.indexToken.address));
        case "crypto":
          return textMatched?.filter((item) =>
            Boolean(item.marketInfo.indexToken?.categories?.some((c) => CRYPTO_CATEGORIES.includes(c)))
          );
        case "tradfi":
          return textMatched?.filter((item) => Boolean(item.marketInfo.indexToken?.categories?.includes("tradfi")));
        case "recently-listed":
          return textMatched?.filter((item) =>
            recentlyListedAddressesSet.has(item.marketInfo.indexTokenAddress.toLowerCase())
          );
      }
    })();

    if (subCategoryTab === "all" || (topLevelTab !== "crypto" && topLevelTab !== "tradfi")) {
      return topLevelFiltered;
    }

    return topLevelFiltered?.filter((item) =>
      Boolean(item.marketInfo.indexToken?.categories?.includes(subCategoryTab as TokenCategory))
    );
  }, [favoriteTokens, marketsOptions, recentlyListedAddressesSet, searchKeyword, subCategoryTab, topLevelTab]);

  useMissedCoinsSearch({
    searchText: searchKeyword,
    isEmpty: !filteredOptions.length && topLevelTab === "all",
    isLoaded: marketsOptions.length > 0,
    place: missedCoinsPlace,
    skip: !missedCoinsPlace,
  });

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.indexName, option.marketInfo);
    setIsModalVisible(false);
  }

  const _handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) {
        onSelectOption(filteredOptions[0]);
      }
    }
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalVisible(true);
  }, []);

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <SlideModal
        qa="market-selector-modal"
        className="TokenSelector-modal"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={footerContent}
        contentPadding={false}
        headerContent={
          <div className="pb-16">
            <SearchInput
              className="mb-16"
              value={searchKeyword}
              setValue={setSearchKeyword}
              placeholder={t`Search market`}
              onKeyDown={_handleKeyDown}
            />
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs
                favoritesKey="market-selector"
                recentlyListedCount={recentlyListedCount}
                selectedValue={topLevelTab}
              />
            </ButtonRowScrollFadeContainer>
            {topLevelTab === "crypto" && populatedCryptoSubCats.size > 0 && (
              <ButtonRowScrollFadeContainer>
                <Tabs
                  options={cryptoSubCatTabs}
                  selectedValue={subCategoryTab}
                  onChange={setSubCategoryTab}
                  type="block"
                  className="bg-slate-800/50 px-16"
                  tabsWrapperClassName="!w-fit"
                  regularOptionClassname="!px-8 !pb-9 !pt-11 text-13"
                />
              </ButtonRowScrollFadeContainer>
            )}
            {topLevelTab === "tradfi" && populatedTradfiSubCats.size > 0 && (
              <ButtonRowScrollFadeContainer>
                <Tabs
                  options={tradfiSubCatTabs}
                  selectedValue={subCategoryTab}
                  onChange={setSubCategoryTab}
                  type="block"
                  className="bg-slate-800/50 px-16"
                  tabsWrapperClassName="!w-fit"
                  regularOptionClassname="!px-8 !pb-9 !pt-11 text-13"
                />
              </ButtonRowScrollFadeContainer>
            )}
          </div>
        }
      >
        <div className="flex flex-col">
          {filteredOptions.map((option, marketIndex) => (
            <MarketListItem
              key={option.marketInfo.marketTokenAddress}
              {...option}
              showBalances={showBalances}
              marketToken={getByKey(marketTokensData, option.marketInfo.marketTokenAddress)}
              isFavorite={favoriteTokens?.includes(option.marketInfo.indexToken.address)}
              isInFirstHalf={marketIndex < filteredOptions.length / 2}
              onSelectOption={onSelectOption}
              onFavoriteClick={toggleFavoriteToken}
            />
          ))}
        </div>
        {filteredOptions.length === 0 && (
          <div className="px-20 text-14 text-typography-secondary">
            <Trans>No markets found</Trans>
          </div>
        )}
      </SlideModal>
      <div
        className={cx(
          "group/hoverable group flex cursor-pointer items-center gap-4 whitespace-nowrap tracking-wide hover:text-blue-300"
        )}
        onClick={handleClick}
        data-qa="market-selector"
      >
        {selectedMarketLabel ? selectedMarketLabel : marketInfo ? getMarketIndexName(marketInfo) : "..."}
        <ChevronDownIcon className="w-16 text-typography-secondary group-hover:text-blue-300" />
      </div>
    </div>
  );
}

function MarketListItem(props: {
  marketInfo: MarketInfo;
  marketToken?: TokenData;
  balance: bigint;
  balanceUsd: bigint;
  indexName: string;
  state?: MarketState;
  isFavorite: boolean;
  isInFirstHalf: boolean;
  showBalances?: boolean;
  onFavoriteClick: (address: string) => void;
  onSelectOption: (option: MarketOption) => void;
}) {
  const {
    marketInfo,
    balance,
    balanceUsd,
    indexName,
    state = {},
    marketToken,
    isFavorite,
    isInFirstHalf,
    showBalances,
    onFavoriteClick,
    onSelectOption,
  } = props;
  const assetImage = importImage(
    `ic_${marketInfo.isSpotOnly ? "swap" : marketInfo.indexToken.symbol.toLowerCase()}.svg`
  );

  const handleFavoriteClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onFavoriteClick(marketInfo.indexToken.address);
    },
    [marketInfo.indexToken.address, onFavoriteClick]
  );

  const handleClick = useCallback(() => {
    if (state.disabled) {
      return;
    }

    onSelectOption({
      marketInfo,
      indexName,
      balance,
      balanceUsd,
      state,
    });
  }, [balance, balanceUsd, indexName, marketInfo, onSelectOption, state]);

  return (
    <div
      className={cx(
        "text-body-medium flex w-full cursor-pointer items-center justify-between p-8 px-20 hover:bg-fill-surfaceHover",
        { disabled: state.disabled }
      )}
      onClick={handleClick}
      data-qa={`market-selector-${indexName}`}
    >
      {state.disabled && state.message && (
        <TooltipWithPortal
          className="TokenSelector-tooltip"
          handle={<div className="TokenSelector-tooltip-backing" />}
          position={isInFirstHalf ? "bottom" : "top"}
          variant="none"
          closeOnDoubleClick
          fitHandleWidth
          renderContent={() => state.message}
        />
      )}
      <div className="Token-info">
        <img src={assetImage} alt={indexName} className="token-logo rounded-full" />
        <div className="Token-symbol">
          <div className="Token-text">{indexName}</div>
        </div>
      </div>
      <div className="Token-balance">
        {showBalances && balance !== undefined && (
          <div className="Token-text">
            {balance > 0
              ? formatTokenAmount(balance, marketToken?.decimals, "", {
                  useCommas: true,
                })
              : "-"}
          </div>
        )}
        <span className="text-accent">
          {(showBalances && balanceUsd !== undefined && balanceUsd > 0 && <div>{formatUsd(balanceUsd)}</div>) || null}
        </span>
      </div>
      <Button variant="ghost" onClick={handleFavoriteClick}>
        <FavoriteStar isFavorite={isFavorite} />
      </Button>
    </div>
  );
}
