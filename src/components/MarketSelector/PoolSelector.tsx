import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getNormalizedTokenSymbol } from "config/tokens";
import {
  GlvOrMarketInfo,
  getGlvDisplayName,
  getMarketIndexName,
  getGlvOrMarketAddress,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";
import {
  gmTokensFavoritesTabOptionLabels,
  gmTokensFavoritesTabOptions,
} from "domain/synthetics/tokens/useGmTokensFavorites";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";

import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Modal from "../Modal/Modal";

import { isGlvInfo } from "domain/synthetics/markets/glv";

import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";
import { PoolListItem } from "./PoolListItem";

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
  favoriteTokens,
  setFavoriteTokens,
  tab,
  setTab,
}: CommonPoolSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const localizedTabOptionLabels = useLocalizedMap(gmTokensFavoritesTabOptionLabels);

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
    const lowercaseSearchKeyword = searchKeyword.toLowerCase();
    return marketsOptions.filter((option) => {
      let name = option.name.toLowerCase();

      const isGlv = isGlvInfo(option.marketInfo);

      if (isGlv) {
        name = "glv " + name;
      }

      const textSearchMatch = name.includes(lowercaseSearchKeyword);
      const favoriteMatch =
        tab === "favorites" ? favoriteTokens?.includes(getGlvOrMarketAddress(option.marketInfo)) : true;

      return textSearchMatch && favoriteMatch;
    });
  }, [favoriteTokens, marketsOptions, searchKeyword, tab]);

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

  const handleFavoriteClick = useCallback(
    (address: string): void => {
      if (favoriteTokens.includes(address)) {
        setFavoriteTokens(favoriteTokens.filter((token) => token !== address));
      } else {
        setFavoriteTokens([...favoriteTokens, address]);
      }
    },
    [favoriteTokens, setFavoriteTokens]
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  }, []);

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
          <SearchInput
            className="mt-15"
            value={searchKeyword}
            setValue={handleSearch}
            placeholder={t`Search Pool`}
            onKeyDown={_handleKeyDown}
          />
        }
      >
        <Tab
          className="mb-10"
          options={gmTokensFavoritesTabOptions}
          optionLabels={localizedTabOptionLabels}
          type="inline"
          option={tab}
          setOption={setTab}
        />

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
                onFavoriteClick={handleFavoriteClick}
                onSelectOption={onSelectOption}
              />
            );
          })}
        </div>
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
