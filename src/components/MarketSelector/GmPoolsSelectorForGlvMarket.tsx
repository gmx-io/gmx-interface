import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getNormalizedTokenSymbol } from "config/tokens";

import { getByKey } from "lib/objects";
import { useFuse } from "lib/useFuse";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
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
import { useTokensFavorites } from "domain/synthetics/tokens/useTokensFavorites";
import { stripBlacklistedWords } from "domain/tokens/utils";

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
  glvInfo,
  disablePoolSelector,
  favoriteKey,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const { favoriteTokens, toggleFavoriteToken, tab } = useTokensFavorites(favoriteKey);

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

  const fuse = useFuse(
    () =>
      marketsOptions.map((item, index) => {
        const indexTokenName = stripBlacklistedWords((item.marketInfo as MarketInfo).indexToken.name);
        const indexTokenSymbol = (item.marketInfo as MarketInfo).indexToken.symbol;

        return {
          id: index,
          indexTokenName,
          indexTokenSymbol,
        };
      }),
    marketsOptions?.map((item) => (item.marketInfo as MarketInfo).marketTokenAddress)
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
              className="*:!text-body-medium"
              value={searchKeyword}
              setValue={setSearchKeyword}
              placeholder={t`Search Pool`}
              onKeyDown={handleKeyDown}
            />
            <FavoriteTabs favoritesKey="gm-pool-selector" />
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
