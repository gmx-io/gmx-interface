import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getNormalizedTokenSymbol } from "config/tokens";

import { getByKey } from "lib/objects";

import { FavoriteGmTabs } from "components/FavoriteTabs/FavoriteGmTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { useGlvGmMarketsWithComposition } from "components/Synthetics/MarketStats/hooks/useMarketGlvGmMarketsCompositions";
import TokenIcon from "components/TokenIcon/TokenIcon";

import {
  GlvInfo,
  MarketInfo,
  getMarketIndexName,
  getGlvOrMarketAddress,
  getMarketPoolName,
  isMarketInfo,
} from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";

import Modal from "../Modal/Modal";
import { PoolListItem } from "./PoolListItem";
import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";

type Props = Omit<CommonPoolSelectorProps, "onSelectMarket"> & {
  isDeposit: boolean;
  glvInfo: GlvInfo;
  onSelectMarket?: (market: MarketInfo) => void;
  disablePoolSelector?: boolean;
};

export function GmPoolsSelectorForGlvMarket({
  className,
  isDeposit,
  label,
  isSideMenu,
  marketTokensData,
  selectedMarketAddress,
  showBalances,
  onSelectMarket,
  getMarketState,
  showAllPools = false,
  showIndexIcon = false,
  favoriteTokens,
  glvInfo,
  toggleFavoriteToken,
  tab,
  disablePoolSelector,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const markets = useGlvGmMarketsWithComposition(isDeposit, glvInfo?.glvTokenAddress);

  const marketsOptions: MarketOption[] = useMemo(() => {
    const allMarkets =
      markets
        .map((market) => {
          const marketInfo = market.market;

          if (!marketInfo) {
            return null;
          }

          const indexName = getMarketIndexName(marketInfo);
          const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);
          const gmBalance = marketToken?.balance;
          const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
          const state = getMarketState?.(marketInfo);

          return {
            indexName,
            poolName: indexName,
            name: marketInfo.name,
            marketInfo: marketInfo,
            balance: gmBalance ?? 0n,
            balanceUsd: gmBalanceUsd ?? 0n,
            state,
          };
        })
        .filter(Boolean as unknown as FilterOutFalsy) ?? [];

    const marketsWithBalance: MarketOption[] = [];
    const marketsWithoutBalance: MarketOption[] = [];

    for (const market of allMarkets) {
      if (market.balance > 0) {
        marketsWithBalance.push(market);
      } else {
        marketsWithoutBalance.push(market);
      }
    }

    const sortedMarketsWithBalance = marketsWithBalance.sort((a, b) => {
      return (b.balanceUsd ?? 0n) > (a.balanceUsd ?? 0n) ? 1 : -1;
    });

    return [...sortedMarketsWithBalance, ...marketsWithoutBalance];
  }, [getMarketState, marketTokensData, markets]);

  const selectedPool = useMemo(
    () => marketsOptions.find((option) => getGlvOrMarketAddress(option.marketInfo) === selectedMarketAddress),
    [marketsOptions, selectedMarketAddress]
  );

  const selectedMarketInfo = selectedPool?.marketInfo;
  const marketInfo = selectedMarketInfo && isMarketInfo(selectedMarketInfo) ? selectedMarketInfo : undefined;

  const filteredOptions = useMemo(() => {
    const lowercaseSearchKeyword = searchKeyword.toLowerCase();
    return marketsOptions.filter((option) => {
      const name = option.name.toLowerCase();
      const textSearchMatch = name.includes(lowercaseSearchKeyword);

      const favoriteMatch =
        tab === "favorites" ? favoriteTokens?.includes(getGlvOrMarketAddress(option.marketInfo)) : true;

      return textSearchMatch && favoriteMatch;
    });
  }, [favoriteTokens, marketsOptions, searchKeyword, tab]);

  const onSelectGmPool = useCallback(
    function onSelectOption(option: MarketOption) {
      if (isMarketInfo(option.marketInfo)) {
        onSelectMarket?.(option.marketInfo);
        setIsModalVisible(false);
      }
    },
    [onSelectMarket, setIsModalVisible]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredOptions.length > 0) {
          onSelectGmPool(filteredOptions[0]);
        }
      }
    },
    [onSelectGmPool, filteredOptions]
  );

  function displayPoolLabel(marketInfo: MarketInfo | undefined) {
    if (!marketInfo) return "...";

    return (
      <div
        className={cx("TokenSelector-box", {
          "pointer-events-none": disablePoolSelector,
        })}
        onClick={!disablePoolSelector ? () => setIsModalVisible(true) : undefined}
      >
        {getMarketIndexName(marketInfo)} [{getMarketPoolName(marketInfo)}]
        {!disablePoolSelector && <BiChevronDown className="TokenSelector-caret" />}
      </div>
    );
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
              setValue={setSearchKeyword}
              placeholder={t`Search Pool`}
              onKeyDown={handleKeyDown}
            />
            <FavoriteGmTabs />
          </div>
        }
      >
        <div className="TokenSelector-tokens">
          {filteredOptions.map((option, marketIndex) => (
            <PoolListItem
              key={getGlvOrMarketAddress(option.marketInfo)}
              {...option}
              marketToken={getByKey(marketTokensData, getGlvOrMarketAddress(option.marketInfo))}
              isFavorite={favoriteTokens?.includes(getGlvOrMarketAddress(option.marketInfo))}
              isInFirstHalf={marketIndex < filteredOptions.length / 2}
              showAllPools={showAllPools}
              showBalances={showBalances}
              onFavoriteClick={toggleFavoriteToken}
              onSelectOption={onSelectGmPool}
            />
          ))}
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
