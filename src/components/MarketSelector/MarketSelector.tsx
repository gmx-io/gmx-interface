import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { getCategoryTokenAddresses } from "config/tokens";
import { MarketInfo, getMarketIndexName } from "domain/synthetics/markets";
import { TokenData, TokensData, convertToUsd } from "domain/synthetics/tokens";
import { useTokensFavorites } from "domain/synthetics/tokens/useTokensFavorites";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { importImage } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import Modal from "../Modal/Modal";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

import "./MarketSelector.scss";

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
  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites("market-selector");

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

  const filteredOptions = useMemo(() => {
    const textMatched = searchKeyword.trim()
      ? searchBy(
          marketsOptions,
          [
            "indexName",
            (item) => (item.marketInfo.isSpotOnly ? "" : stripBlacklistedWords(item.marketInfo.indexToken.name)),
          ],
          searchKeyword
        )
      : marketsOptions;

    if (tab === "all") {
      return textMatched;
    }

    if (tab === "favorites") {
      return textMatched?.filter((item) => favoriteTokens?.includes(item.marketInfo.indexToken.address));
    }

    const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);
    const tabMatched = textMatched?.filter((item) =>
      categoryTokenAddresses.includes(item.marketInfo.indexToken.address)
    );

    return tabMatched;
  }, [chainId, favoriteTokens, marketsOptions, searchKeyword, tab]);

  useMissedCoinsSearch({
    searchText: searchKeyword,
    isEmpty: !filteredOptions.length && tab === "all",
    isLoaded: marketsOptions.length > 0,
    place: missedCoinsPlace,
    skip: !missedCoinsPlace,
  });

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.indexName, option.marketInfo);
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

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <Modal
        qa="market-selector-modal"
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        footerContent={footerContent}
        headerContent={
          <div className="mt-16">
            <SearchInput
              className="mb-8 *:!text-body-medium"
              value={searchKeyword}
              setValue={setSearchKeyword}
              placeholder={t`Search Market`}
              onKeyDown={_handleKeyDown}
            />
            <ButtonRowScrollFadeContainer>
              <FavoriteTabs favoritesKey="market-selector" />
            </ButtonRowScrollFadeContainer>
          </div>
        }
      >
        <div className="TokenSelector-tokens">
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
          <div className="text-16 text-slate-100">
            <Trans>No markets matched.</Trans>
          </div>
        )}
      </Modal>
      {selectedMarketLabel ? (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)} data-qa="market-selector">
          {selectedMarketLabel}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      ) : (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)} data-qa="market-selector">
          {marketInfo ? getMarketIndexName(marketInfo) : "..."}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      )}
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
    `ic_${marketInfo.isSpotOnly ? "swap" : marketInfo.indexToken.symbol.toLowerCase()}_40.svg`
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
      className={cx("TokenSelector-token-row", { disabled: state.disabled })}
      onClick={handleClick}
      data-qa={`market-selector-${indexName}`}
    >
      {state.disabled && state.message && (
        <TooltipWithPortal
          className="TokenSelector-tooltip"
          handle={<div className="TokenSelector-tooltip-backing" />}
          position={isInFirstHalf ? "bottom" : "top"}
          disableHandleStyle
          closeOnDoubleClick
          fitHandleWidth
          renderContent={() => state.message}
        />
      )}
      <div className="Token-info">
        <img src={assetImage} alt={indexName} className="token-logo" />
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
      <div
        className="favorite-star flex cursor-pointer items-center rounded-4 p-9 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
        onClick={handleFavoriteClick}
      >
        <FavoriteStar isFavorite={isFavorite} />
      </div>
    </div>
  );
}
