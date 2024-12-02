import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getNormalizedTokenSymbol } from "config/tokens";
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
import { useFuse } from "lib/useFuse";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Modal from "../Modal/Modal";
import { PoolListItem } from "./PoolListItem";

import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";

export function PoolSelector({
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
  favoriteKey,
}: CommonPoolSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites(favoriteKey);

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

  const fuse = useFuse(
    () =>
      marketsOptions.map((item, index) => ({
        id: index,
        name: isGlvInfo(item.marketInfo) ? getGlvDisplayName(item.marketInfo) : item.name,
        longTokenName: stripBlacklistedWords(item.marketInfo.longToken.name),
        shortTokenName: stripBlacklistedWords(item.marketInfo.shortToken.name),
      })),
    marketsOptions?.map((item) => item.indexName)
  );

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? fuse.search(searchKeyword).map((result) => marketsOptions[result.item.id])
      : marketsOptions;

    const tabMatched = textMatched?.filter((item) => {
      if (tab === "favorites") {
        return favoriteTokens?.includes(getGlvOrMarketAddress(item.marketInfo));
      }

      return true;
    });

    return tabMatched;
  }, [favoriteTokens, fuse, marketsOptions, searchKeyword, tab]);

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
          <div className="mt-16 flex items-center gap-16">
            <SearchInput
              value={searchKeyword}
              className="*:!text-body-medium"
              setValue={setSearchKeyword}
              placeholder={t`Search Pool`}
              onKeyDown={_handleKeyDown}
            />
            <FavoriteTabs favoritesKey="gm-token-receive-pay-selector" />
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
          <div className="text-16 text-gray-400">
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
