import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getNormalizedTokenSymbol } from "config/tokens";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TokenData, TokensData, convertToUsd } from "domain/synthetics/tokens";
import {
  GmTokensFavoritesContextType,
  gmTokensFavoritesTabOptionLabels,
  gmTokensFavoritesTabOptions,
} from "domain/synthetics/tokens/useGmTokensFavorites";
import { useLocalizedMap } from "lib/i18n";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Modal from "../Modal/Modal";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

import "./MarketSelector.scss";

type Props = {
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  isSideMenu?: boolean;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (market: MarketInfo) => void;
  showAllPools?: boolean;
  showIndexIcon?: boolean;
} & GmTokensFavoritesContextType;

type MarketState = {
  disabled?: boolean;
  message?: string;
};

type MarketOption = {
  indexName: string;
  poolName: string;
  name: string;
  marketInfo: MarketInfo;
  balance: bigint;
  balanceUsd: bigint;
  state?: MarketState;
};

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
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const localizedTabOptionLabels = useLocalizedMap(gmTokensFavoritesTabOptionLabels);

  const marketsOptions: MarketOption[] = useMemo(() => {
    const allMarkets = markets
      .filter((market) => !market.isDisabled && (showAllPools || getMarketIndexName(market) === selectedIndexName))
      .map((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);
        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(marketInfo);

        return {
          indexName,
          poolName,
          name: marketInfo.name,
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
    () => marketsOptions.find((option) => option.marketInfo.marketTokenAddress === selectedMarketAddress)?.marketInfo,
    [marketsOptions, selectedMarketAddress]
  );

  const filteredOptions = useMemo(() => {
    const lowercaseSearchKeyword = searchKeyword.toLowerCase();
    return marketsOptions.filter((option) => {
      const name = option.name.toLowerCase();
      const textSearchMatch = name.includes(lowercaseSearchKeyword);

      const favoriteMatch = tab === "favorites" ? favoriteTokens?.includes(option.marketInfo.marketTokenAddress) : true;

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

  function displayPoolLabel(marketInfo: MarketInfo | undefined) {
    if (!marketInfo) return "...";
    const name = showAllPools ? `GM: ${getMarketIndexName(marketInfo)}` : getMarketPoolName(marketInfo);

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
          {filteredOptions.map((option, marketIndex) => (
            <PoolListItem
              key={option.marketInfo.marketTokenAddress}
              {...option}
              marketToken={getByKey(marketTokensData, option.marketInfo.marketTokenAddress)}
              isFavorite={favoriteTokens?.includes(option.marketInfo.marketTokenAddress)}
              isInFirstHalf={marketIndex < filteredOptions.length / 2}
              showAllPools={showAllPools}
              showBalances={showBalances}
              onFavoriteClick={handleFavoriteClick}
              onSelectOption={onSelectOption}
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

function PoolListItem(props: {
  marketInfo: MarketInfo;
  marketToken?: TokenData;
  poolName: string;
  balance: bigint;
  balanceUsd: bigint;
  indexName: string;
  state?: MarketState;
  isFavorite: boolean;
  isInFirstHalf: boolean;
  showAllPools?: boolean;
  showBalances?: boolean;
  onFavoriteClick: (address: string) => void;
  onSelectOption: (option: MarketOption) => void;
}) {
  const {
    marketInfo,
    poolName,
    balance,
    balanceUsd,
    indexName,
    state = {},
    marketToken,
    isFavorite,
    isInFirstHalf,
    showAllPools,
    showBalances,
    onFavoriteClick,
    onSelectOption,
  } = props;
  const { longToken, shortToken, indexToken } = marketInfo;

  const indexTokenImage = marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFavoriteClick(marketInfo.marketTokenAddress);
  };

  const handleClick = useCallback(() => {
    if (state.disabled) {
      return;
    }

    onSelectOption({
      marketInfo,
      indexName,
      poolName,
      balance,
      balanceUsd,
      state,
      name: marketInfo.name,
    });
  }, [balance, balanceUsd, indexName, marketInfo, onSelectOption, poolName, state]);

  return (
    <div className={cx("TokenSelector-token-row", { disabled: state.disabled })} onClick={handleClick}>
      {state.disabled && state.message && (
        <TooltipWithPortal
          className="TokenSelector-tooltip"
          handle={<div className="TokenSelector-tooltip-backing" />}
          position={isInFirstHalf ? "bottom" : "top"}
          disableHandleStyle
          closeOnDoubleClick
          fitHandleWidth
          content={state.message}
        />
      )}
      <div className="Token-info">
        <div className="collaterals-logo">
          {showAllPools ? (
            <TokenIcon symbol={indexTokenImage} displaySize={40} importSize={40} />
          ) : (
            <>
              <TokenIcon
                symbol={longToken.symbol}
                displaySize={40}
                importSize={40}
                className="collateral-logo collateral-logo-first"
              />
              {shortToken && (
                <TokenIcon
                  symbol={shortToken.symbol}
                  displaySize={40}
                  importSize={40}
                  className="collateral-logo collateral-logo-second"
                />
              )}
            </>
          )}
        </div>
        <div className="Token-symbol">
          <div className="Token-text">
            {showAllPools ? (
              <div className="flex items-center leading-1">
                <span>{indexName && indexName}</span>
                <span className="subtext">{poolName && `[${poolName}]`}</span>
              </div>
            ) : (
              <div className="Token-text">{poolName}</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="Token-balance">
          {(showBalances && balance !== undefined && (
            <div className="Token-text">
              {balance > 0
                ? formatTokenAmount(balance, marketToken?.decimals, "GM", {
                    useCommas: true,
                  })
                : "-"}
            </div>
          )) ||
            null}
          <span className="text-accent">
            {(showBalances && balanceUsd !== undefined && balanceUsd > 0 && <div>{formatUsd(balanceUsd)}</div>) || null}
          </span>
        </div>
        <div
          className="favorite-star flex cursor-pointer items-center rounded-4 p-9 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
          onClick={handleFavoriteClick}
        >
          <FavoriteStar isFavorite={isFavorite} />
        </div>
      </div>
    </div>
  );
}
