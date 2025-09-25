import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import { useTokensFavorites } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import {
  GlvOrMarketInfo,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd } from "domain/synthetics/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getCategoryTokenAddresses, getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { PoolListItem } from "./PoolListItem";
import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";

function PoolLabel({
  marketInfo,
  showAllPools,
  marketsOptions,
  onClick,
}: {
  marketInfo: GlvOrMarketInfo | undefined;
  showAllPools: boolean;
  marketsOptions: MarketOption[];
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  if (!marketInfo) return "...";
  let name: string;

  if (isGlvInfo(marketInfo)) {
    name = getGlvDisplayName(marketInfo);
  } else {
    name = showAllPools ? `GM: ${getMarketIndexName(marketInfo)}` : getMarketPoolName(marketInfo);
  }

  if (marketsOptions?.length > 1) {
    return (
      <div
        className={cx("group flex cursor-pointer items-center gap-4 whitespace-nowrap hover:text-blue-300")}
        onClick={onClick}
      >
        {name ? name : "..."}
        <ChevronDownIcon className="w-16 text-typography-secondary group-hover:text-blue-300" />
      </div>
    );
  }

  return <div>{name ? name : "..."}</div>;
}

export function PoolSelector({
  chainId,
  selectedMarketAddress,
  className,
  selectedIndexName,
  label,
  markets,
  isSideMenu,
  marketTokensData,
  showBalances,
  onSelectMarket,
  getMarketState,
  showAllPools = false,
  showIndexIcon = false,
  withFilters = true,
  favoriteKey,
}: CommonPoolSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const { tab: filterTab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites(favoriteKey);

  const tab = withFilters ? filterTab : "all";

  const marketsOptions: MarketOption[] = useMemo(() => {
    const allMarkets = markets
      .filter(
        (market) =>
          !market.isDisabled &&
          (isGlvInfo(market) ? true : market.indexToken) &&
          (showAllPools || getMarketIndexName(market) === selectedIndexName)
      )
      .map((glvOrMarketInfo) => {
        const indexName = getMarketIndexName(glvOrMarketInfo);
        const poolName = getMarketPoolName(glvOrMarketInfo);
        const marketToken = getByKey(marketTokensData, getGlvOrMarketAddress(glvOrMarketInfo));
        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(glvOrMarketInfo);

        return {
          indexName,
          poolName,
          name: isGlvInfo(glvOrMarketInfo) ? glvOrMarketInfo.name ?? "GLV" : glvOrMarketInfo.name,
          glvOrMarketInfo,
          balance: gmBalance ?? 0n,
          balanceUsd: gmBalanceUsd ?? 0n,
          state,
        };
      });
    const marketsWithBalance: MarketOption[] = [];
    const marketsWithoutBalance: MarketOption[] = [];

    for (const market of allMarkets) {
      if (market.balance > 0) {
        marketsWithBalance.push(market);
      } else {
        marketsWithoutBalance.push(market);
      }
    }

    const sortedMartketsWithBalance = marketsWithBalance.sort((a, b) => {
      return (b.balanceUsd ?? 0n) > (a.balanceUsd ?? 0n) ? 1 : -1;
    });

    return [...sortedMartketsWithBalance, ...marketsWithoutBalance];
  }, [getMarketState, marketTokensData, markets, selectedIndexName, showAllPools]);

  const marketInfo = useMemo(
    () =>
      marketsOptions.find((option) => getGlvOrMarketAddress(option.glvOrMarketInfo) === selectedMarketAddress)
        ?.glvOrMarketInfo,
    [marketsOptions, selectedMarketAddress]
  );

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            (item) => (isGlvInfo(item.glvOrMarketInfo) ? getGlvDisplayName(item.glvOrMarketInfo) : item.name),
            (item) => stripBlacklistedWords(item.glvOrMarketInfo.longToken.name),
            (item) => stripBlacklistedWords(item.glvOrMarketInfo.shortToken.name),
          ],
          searchKeyword
        )
      : marketsOptions;

    if (tab === "all") {
      return textMatched;
    } else if (tab === "favorites") {
      return textMatched?.filter((item) => favoriteTokens?.includes(getGlvOrMarketAddress(item.glvOrMarketInfo)));
    } else {
      const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);
      return textMatched?.filter((item) => {
        if (isGlvInfo(item.glvOrMarketInfo)) {
          return false;
        }

        if (item.glvOrMarketInfo.isSpotOnly) {
          return false;
        }

        return categoryTokenAddresses.includes(item.glvOrMarketInfo.indexTokenAddress);
      });
    }
  }, [chainId, favoriteTokens, marketsOptions, searchKeyword, tab]);

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.glvOrMarketInfo);
    setIsModalVisible(false);
  }

  const _handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) {
        onSelectOption(filteredOptions[0]);
      }
    }
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsModalVisible(true);
  }, []);

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <SlideModal
        className="TokenSelector-modal"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        contentPadding={false}
        headerContent={
          <div className="pb-12">
            <SearchInput
              value={searchKeyword}
              className={cx({ "mb-8": withFilters })}
              setValue={setSearchKeyword}
              placeholder={t`Search Pool`}
              onKeyDown={_handleKeyDown}
            />
            {withFilters && (
              <ButtonRowScrollFadeContainer>
                <FavoriteTabs favoritesKey={favoriteKey} />
              </ButtonRowScrollFadeContainer>
            )}
          </div>
        }
      >
        <VerticalScrollFadeContainer className="flex grow flex-col">
          {filteredOptions.map((option, marketIndex) => {
            return (
              <PoolListItem
                key={getGlvOrMarketAddress(option.glvOrMarketInfo)}
                {...option}
                marketToken={getByKey(marketTokensData, getGlvOrMarketAddress(option.glvOrMarketInfo))}
                isFavorite={favoriteTokens?.includes(getGlvOrMarketAddress(option.glvOrMarketInfo))}
                isInFirstHalf={marketIndex < filteredOptions.length / 2}
                showAllPools={showAllPools}
                showBalances={showBalances}
                onFavoriteClick={toggleFavoriteToken}
                onSelectOption={onSelectOption}
              />
            );
          })}
          {filteredOptions.length === 0 && (
            <div className="text-body-medium text-typography-secondary">
              <Trans>No pools matched</Trans>
            </div>
          )}
        </VerticalScrollFadeContainer>
      </SlideModal>

      {marketInfo && (
        <div className="inline-flex items-center">
          {showIndexIcon && (
            <TokenIcon
              className="mr-5"
              symbol={
                marketInfo.isSpotOnly
                  ? getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
                    getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
                  : isGlvInfo(marketInfo)
                    ? marketInfo.glvToken.symbol
                    : marketInfo?.indexToken.symbol
              }
              importSize={40}
              displaySize={20}
            />
          )}
          <PoolLabel
            marketInfo={marketInfo}
            showAllPools={showAllPools}
            marketsOptions={marketsOptions}
            onClick={handleClick}
          />
        </div>
      )}
    </div>
  );
}
