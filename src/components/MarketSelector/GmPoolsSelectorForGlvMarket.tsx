import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import { useTokensFavorites } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import {
  GlvInfo,
  MarketInfo,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
  isMarketInfo,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { convertToUsd } from "domain/synthetics/tokens";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";
import { getCategoryTokenAddresses, getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import { useGlvGmMarketsWithComposition } from "components/MarketStats/hooks/useMarketGlvGmMarketsCompositions";
import { SlideModal } from "components/Modal/SlideModal";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { PoolListItem } from "./PoolListItem";
import { CommonPoolSelectorProps, MarketOption } from "./types";

import "./MarketSelector.scss";

type Props = Omit<CommonPoolSelectorProps, "onSelectMarket"> & {
  isDeposit: boolean;
  glvInfo: GlvInfo;
  onSelectMarket?: (market: MarketInfo) => void;
  disablePoolSelector?: boolean;
};

function PoolLabel({
  marketInfo,
  disablePoolSelector,
  onClick,
}: {
  marketInfo: MarketInfo | undefined;
  disablePoolSelector?: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  if (!marketInfo) return "...";

  return (
    <div
      className={cx("group flex cursor-pointer items-center gap-4 whitespace-nowrap hover:text-blue-300", {
        "pointer-events-none": disablePoolSelector,
      })}
      onClick={!disablePoolSelector ? onClick : undefined}
    >
      {getMarketIndexName(marketInfo)} [{getMarketPoolName(marketInfo)}]
      {!disablePoolSelector && (
        <ChevronDownIcon className="size-16 text-typography-secondary group-hover:text-blue-300" />
      )}
    </div>
  );
}

export function GmPoolsSelectorForGlvMarket({
  chainId,
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
            glvOrMarketInfo: marketInfo,
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
    () => marketsOptions.find((option) => getGlvOrMarketAddress(option.glvOrMarketInfo) === selectedMarketAddress),
    [marketsOptions, selectedMarketAddress]
  );

  const selectedMarketInfo = selectedPool?.glvOrMarketInfo;
  const marketInfo = selectedMarketInfo && isMarketInfo(selectedMarketInfo) ? selectedMarketInfo : undefined;

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            (item) => stripBlacklistedWords((item.glvOrMarketInfo as MarketInfo).indexToken.name),
            (item) => (item.glvOrMarketInfo as MarketInfo).indexToken.symbol,
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

  const onSelectGmPool = useCallback(
    function onSelectOption(option: MarketOption) {
      if (isMarketInfo(option.glvOrMarketInfo)) {
        onSelectMarket?.(option.glvOrMarketInfo);
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

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsModalVisible(true);
  }, []);

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <SlideModal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        className="TokenSelector-modal"
        contentPadding={false}
        headerContent={
          <div className="pb-12">
            <SearchInput
              className="mb-8"
              value={searchKeyword}
              setValue={setSearchKeyword}
              placeholder={t`Search Pool`}
              onKeyDown={handleKeyDown}
            />
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs favoritesKey={favoriteKey} />
            </ButtonRowScrollFadeContainer>
          </div>
        }
      >
        <VerticalScrollFadeContainer className="flex flex-col gap-8">
          {filteredOptions.map((option, marketIndex) => (
            <PoolListItem
              key={getGlvOrMarketAddress(option.glvOrMarketInfo)}
              {...option}
              marketToken={getByKey(marketTokensData, getGlvOrMarketAddress(option.glvOrMarketInfo))}
              isFavorite={favoriteTokens?.includes(getGlvOrMarketAddress(option.glvOrMarketInfo))}
              isInFirstHalf={marketIndex < filteredOptions.length / 2}
              showAllPools={showAllPools}
              showBalances={showBalances}
              onFavoriteClick={toggleFavoriteToken}
              onSelectOption={onSelectGmPool}
            />
          ))}
          {filteredOptions.length === 0 && (
            <div className="text-body-medium px-adaptive text-typography-secondary">
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
                  : marketInfo?.indexToken.symbol
              }
              displaySize={20}
            />
          )}
          <PoolLabel marketInfo={marketInfo} disablePoolSelector={disablePoolSelector} onClick={handleClick} />
        </div>
      )}
    </div>
  );
}
