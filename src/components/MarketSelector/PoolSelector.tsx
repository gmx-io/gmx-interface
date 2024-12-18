import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getCategoryTokenAddresses, getNormalizedTokenSymbol } from "config/tokens";
import {
  GlvOrMarketInfo,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd } from "domain/synthetics/tokens";
import { useTokensFavorites } from "domain/synthetics/tokens/useTokensFavorites";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Modal from "../Modal/Modal";
import { PoolListItem } from "./PoolListItem";

import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";

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
      .map((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        const marketToken = getByKey(marketTokensData, getGlvOrMarketAddress(marketInfo));
        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(marketInfo);

        return {
          indexName,
          poolName,
          name: isGlvInfo(marketInfo) ? marketInfo.name ?? "GLV" : marketInfo.name,
          marketInfo,
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
      marketsOptions.find((option) => getGlvOrMarketAddress(option.marketInfo) === selectedMarketAddress)?.marketInfo,
    [marketsOptions, selectedMarketAddress]
  );

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            (item) => (isGlvInfo(item.marketInfo) ? getGlvDisplayName(item.marketInfo) : item.name),
            (item) => stripBlacklistedWords(item.marketInfo.longToken.name),
            (item) => stripBlacklistedWords(item.marketInfo.shortToken.name),
          ],
          searchKeyword
        )
      : marketsOptions;

    if (tab === "all") {
      return textMatched;
    } else if (tab === "favorites") {
      return textMatched?.filter((item) => favoriteTokens?.includes(getGlvOrMarketAddress(item.marketInfo)));
    } else {
      const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);
      return textMatched?.filter((item) => {
        if (isGlvInfo(item.marketInfo)) {
          return false;
        }

        if (item.marketInfo.isSpotOnly) {
          return false;
        }

        return categoryTokenAddresses.includes(item.marketInfo.indexTokenAddress);
      });
    }
  }, [chainId, favoriteTokens, marketsOptions, searchKeyword, tab]);

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.marketInfo);
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

  function displayPoolLabel(marketInfo: GlvOrMarketInfo | undefined) {
    if (!marketInfo) return "...";
    let name;

    if (isGlvInfo(marketInfo)) {
      name = getGlvDisplayName(marketInfo);
    } else {
      name = showAllPools ? `GM: ${getMarketIndexName(marketInfo)}` : getMarketPoolName(marketInfo);
    }

    if (marketsOptions?.length > 1) {
      return (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {name ? name : "..."}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      );
    }

    return <div>{name ? name : "..."}</div>;
  }

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        headerContent={
          <div className="mt-16">
            <SearchInput
              value={searchKeyword}
              className={cx("*:!text-body-medium", { "mb-8": withFilters })}
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
        <div className="TokenSelector-tokens">
          {filteredOptions.map((option, marketIndex) => {
            return (
              <PoolListItem
                key={getGlvOrMarketAddress(option.marketInfo)}
                {...option}
                marketToken={getByKey(marketTokensData, getGlvOrMarketAddress(option.marketInfo))}
                isFavorite={favoriteTokens?.includes(getGlvOrMarketAddress(option.marketInfo))}
                isInFirstHalf={marketIndex < filteredOptions.length / 2}
                showAllPools={showAllPools}
                showBalances={showBalances}
                onFavoriteClick={toggleFavoriteToken}
                onSelectOption={onSelectOption}
              />
            );
          })}
        </div>
        {filteredOptions.length === 0 && (
          <div className="text-body-medium text-gray-400">
            <Trans>No pools matched.</Trans>
          </div>
        )}
      </Modal>

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
          {displayPoolLabel(marketInfo)}
        </div>
      )}
    </div>
  );
}
