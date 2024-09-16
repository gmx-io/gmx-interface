import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { useMedia } from "react-use";

import { USD_DECIMALS } from "config/factors";
import { getMarketListingDate } from "config/markets";
import { getNormalizedTokenSymbol } from "config/tokens";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getGlvDisplayName,
  getGlvMarketShortening,
  getGlvMarketSubtitle,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { getIsBaseApyReadyToBeShown } from "domain/synthetics/markets/getIsBaseApyReadyToBeShown";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { GmTokenFavoritesTabOption, useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import {
  indexTokensFavoritesTabOptionLabels,
  marketTokensTabOptions,
} from "domain/synthetics/tokens/useIndexTokensFavorites";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { useLocalizedMap } from "lib/i18n";
import { formatAmountHuman, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AprInfo } from "components/AprInfo/AprInfo";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import SearchInput from "components/SearchInput/SearchInput";
import { SortDirection, Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { getMintableInfoGlv, getSellableInfoGlv, isGlv } from "domain/synthetics/markets/glv";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

type Props = {
  chainId: number;
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensLidoAprData?: MarketTokensAPRData;
  glvMarketsTokensApyData?: MarketTokensAPRData;
  // eslint-disable-next-line react/no-unused-prop-types
  currentMarketInfo?: MarketInfo;
};

export default function MarketTokenSelector(props: Props) {
  const {
    chainId,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    marketsTokensAPRData,
    marketsInfoData,
    marketTokensData,
    currentMarketInfo,
    glvMarketsTokensApyData,
  } = props;
  const indexName = currentMarketInfo && getMarketIndexName(currentMarketInfo);
  const poolName = currentMarketInfo && getMarketPoolName(currentMarketInfo);

  const iconName = currentMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(currentMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(currentMarketInfo.shortToken.symbol)
    : currentMarketInfo?.indexToken.symbol;

  const isGlvMarket = currentMarketInfo && isGlv(currentMarketInfo);

  return (
    <SelectorBase
      handleClassName="inline-block"
      popoverYOffset={18}
      popoverXOffset={-8}
      popoverPlacement="bottom-start"
      label={
        <div className="inline-flex items-center">
          {currentMarketInfo ? (
            <>
              <TokenIcon
                symbol={iconName}
                displaySize={30}
                importSize={40}
                badge={
                  isGlvMarket
                    ? getGlvMarketShortening(chainId, currentMarketInfo.indexTokenAddress)
                    : ([currentMarketInfo.longToken.symbol, currentMarketInfo.shortToken.symbol] as const)
                }
              />
              <div className="ml-16">
                <div className="flex items-center text-16">
                  {isGlvMarket ? (
                    <span>{getGlvDisplayName(currentMarketInfo)}</span>
                  ) : (
                    <span>GM{indexName && `: ${indexName}`}</span>
                  )}
                  <span className="ml-3 text-12 text-gray-300 group-hover/selector-base:text-[color:inherit]">
                    {poolName && `[${poolName}]`}
                  </span>
                </div>
                <div className="text-12 text-gray-400 group-hover/selector-base:text-[color:inherit]">
                  {isGlvMarket
                    ? getGlvMarketSubtitle(chainId, currentMarketInfo.indexTokenAddress)
                    : "GMX Market Tokens"}
                </div>
              </div>
            </>
          ) : (
            "..."
          )}
        </div>
      }
      modalLabel={t`GMX Market Tokens`}
      mobileModalContentPadding={false}
    >
      <MarketTokenSelectorInternal
        chainId={chainId}
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        marketsTokensAPRData={marketsTokensAPRData}
        marketsTokensLidoAprData={marketsTokensLidoAprData}
        marketsInfoData={marketsInfoData}
        marketTokensData={marketTokensData}
        currentMarketInfo={currentMarketInfo}
        glvMarketsTokensApyData={glvMarketsTokensApyData}
      />
    </SelectorBase>
  );
}

type SortField = "buyable" | "sellable" | "apy" | "unspecified";

function MarketTokenSelectorInternal(props: Props) {
  const {
    chainId,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    marketsTokensAPRData,
    marketsInfoData,
    marketTokensData,
    glvMarketsTokensApyData,
  } = props;
  const { markets: sortedMarketsByIndexToken } = useSortedPoolsWithIndexToken(marketsInfoData, marketTokensData);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchKeyword, setSearchKeyword] = useState("");
  const history = useHistory();

  const { tab, setTab, favoriteTokens, setFavoriteTokens } = useGmTokensFavorites();

  const sortedTokensInfo = useFilterSortTokensInfo({
    chainId,
    sortedMarketsByIndexToken,
    searchKeyword,
    tab,
    marketsInfoData,
    favoriteTokens,
    marketsTokensAPRData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvMarketsTokensApyData,
    orderBy,
    direction,
    marketTokensData: marketTokensData,
  });

  const close = useSelectorClose();

  const handleSelectToken = useCallback(
    (marketTokenAddress: string) => {
      close();
      history.push({
        pathname: "/pools",
        search: `?market=${marketTokenAddress}`,
      });
    },
    [close, history]
  );

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isSmallMobile = useMedia("(max-width: 560px)");

  const rowVerticalPadding = isMobile ? "py-8" : cx("py-4 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isSmallMobile ? cx("px-6 first-of-type:pl-15 last-of-type:pr-15") : "px-15";
  const thClassName = cx(
    "sticky top-0 z-10 bg-slate-800 text-left font-normal uppercase text-gray-400 last-of-type:text-right",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx("last-of-type:text-right", rowVerticalPadding, rowHorizontalPadding);

  const localizedTabOptionLabels = useLocalizedMap(indexTokensFavoritesTabOptionLabels);

  const handleFavoriteClick = useCallback(
    (address: string) => {
      if (favoriteTokens.includes(address)) {
        setFavoriteTokens(favoriteTokens.filter((item) => item !== address));
      } else {
        setFavoriteTokens([...favoriteTokens, address]);
      }
    },
    [favoriteTokens, setFavoriteTokens]
  );

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && sortedTokensInfo.length > 0) {
        handleSelectToken(sortedTokensInfo[0].market.address);
      }
    },
    [sortedTokensInfo, handleSelectToken]
  );

  return (
    <>
      <SelectorBaseMobileHeaderContent>
        <SearchInput
          className="mt-15"
          value={searchKeyword}
          setValue={handleSearch}
          onKeyDown={handleKeyDown}
          placeholder="Search Pool"
        />
      </SelectorBaseMobileHeaderContent>
      <div
        className={cx({
          "w-[630px]": !isMobile,
        })}
      >
        {!isMobile && (
          <>
            <SearchInput
              className="m-15"
              value={searchKeyword}
              setValue={({ target }) => setSearchKeyword(target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sortedTokensInfo.length > 0) {
                  handleSelectToken(sortedTokensInfo[0].market.address);
                }
              }}
              placeholder="Search Pool"
            />
            <div className="divider" />
          </>
        )}

        <Tab
          className="px-15 py-4"
          options={marketTokensTabOptions}
          optionLabels={localizedTabOptionLabels}
          type="inline"
          option={tab}
          setOption={setTab}
        />

        <div
          className={cx({
            "max-h-[444px] overflow-y-auto": !isMobile,
          })}
        >
          <table className="w-full">
            {sortedMarketsByIndexToken.length > 0 && (
              <thead>
                <tr>
                  <th className={thClassName} colSpan={2}>
                    <Trans>POOL</Trans>
                  </th>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("buyable")}>
                      {isSmallMobile ? <Trans>BUY&hellip;</Trans> : <Trans>BUYABLE</Trans>}
                    </Sorter>
                  </th>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("sellable")}>
                      {isSmallMobile ? <Trans>SELL&hellip;</Trans> : <Trans>SELLABLE</Trans>}
                    </Sorter>
                  </th>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("apy")}>
                      <Trans>APY</Trans>
                    </Sorter>
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {sortedTokensInfo.map((option) => (
                <MarketTokenListItem
                  key={option.market.address}
                  {...option}
                  tdClassName={tdClassName}
                  isFavorite={favoriteTokens.includes(option.market.address)}
                  onFavorite={handleFavoriteClick}
                  handleSelectToken={handleSelectToken}
                  isSmallMobile={isSmallMobile}
                  rowVerticalPadding={rowVerticalPadding}
                />
              ))}
            </tbody>
          </table>
        </div>
        {sortedMarketsByIndexToken.length > 0 && !sortedTokensInfo?.length && (
          <div className="py-15 text-center text-gray-400">
            <Trans>No markets matched.</Trans>
          </div>
        )}
      </div>
    </>
  );
}

function useFilterSortTokensInfo({
  chainId,
  sortedMarketsByIndexToken,
  searchKeyword,
  tab,
  marketsInfoData,
  favoriteTokens,
  marketTokensData,
  marketsTokensAPRData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvMarketsTokensApyData,
  orderBy,
  direction,
}: {
  chainId: number;
  sortedMarketsByIndexToken: TokenData[];
  searchKeyword: string;
  tab: GmTokenFavoritesTabOption;
  marketTokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  favoriteTokens: string[];
  marketsTokensAPRData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
  orderBy: SortField;
  direction: SortDirection;
}) {
  const filteredTokensInfo = useMemo(() => {
    if (sortedMarketsByIndexToken.length < 1) {
      return [];
    }

    let filteredTokens: TokenData[];
    if (searchKeyword.length < 1 && tab === "all") {
      filteredTokens = sortedMarketsByIndexToken;
    } else {
      filteredTokens = sortedMarketsByIndexToken.filter((market) => {
        const marketInfo = getByKey(marketsInfoData, market?.address)!;
        let textSearchMatch = false;
        if (!searchKeyword.trim()) {
          textSearchMatch = true;
        } else {
          const marketName = isGlv(marketInfo) ? getGlvDisplayName(marketInfo) : marketInfo.name;
          textSearchMatch = marketName.toLowerCase().includes(searchKeyword.toLowerCase());
        }

        const favoriteMatch = tab === "favorites" ? favoriteTokens?.includes(market.address) : true;
        return textSearchMatch && favoriteMatch;
      });
    }

    return filteredTokens.map((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;

      const isGlvMarket = isGlv(marketInfo);

      const mintableInfo = isGlvMarket
        ? getMintableInfoGlv(marketInfo, marketTokensData)
        : getMintableMarketTokens(marketInfo, market);
      const sellableInfo = isGlvMarket
        ? getSellableInfoGlv(marketInfo, marketsInfoData, marketTokensData)
        : getSellableMarketToken(marketInfo, market);
      const apr = getByKey(isGlvMarket ? glvMarketsTokensApyData : marketsTokensAPRData, market?.address);
      const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
      const lidoApr = getByKey(marketsTokensLidoAprData, marketInfo?.marketTokenAddress);
      const indexName = isGlvMarket ? getGlvDisplayName(marketInfo) : getMarketIndexName(marketInfo);
      const poolName = getMarketPoolName(marketInfo);
      return {
        market,
        mintableInfo,
        sellableInfo,
        marketInfo,
        indexName,
        poolName,
        apr,
        incentiveApr,
        lidoApr,
      };
    });
  }, [
    favoriteTokens,
    marketsInfoData,
    marketsTokensAPRData,
    marketsTokensIncentiveAprData,
    searchKeyword,
    sortedMarketsByIndexToken,
    marketsTokensLidoAprData,
    tab,
    marketTokensData,
    glvMarketsTokensApyData,
  ]);

  const sortedTokensInfo = useMemo(() => {
    if (orderBy === "unspecified" || direction === "unspecified") {
      return filteredTokensInfo;
    }

    const directionMultiplier = direction === "asc" ? 1 : -1;

    return filteredTokensInfo.slice().sort((a, b) => {
      if (orderBy === "buyable") {
        const mintableA = a.mintableInfo?.mintableUsd ?? 0n;
        const mintableB = b.mintableInfo?.mintableUsd ?? 0n;
        return mintableA > mintableB ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "sellable") {
        const sellableA = a.sellableInfo?.totalAmount ?? 0n;
        const sellableB = b.sellableInfo?.totalAmount ?? 0n;
        return sellableA > sellableB ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "apy") {
        let aprA = a.incentiveApr ?? 0n;
        if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, a.marketInfo.marketTokenAddress))) {
          aprA += a.apr ?? 0n;
        }

        let aprB = b.incentiveApr ?? 0n;
        if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, b.marketInfo.marketTokenAddress))) {
          aprB += b.apr ?? 0n;
        }

        return aprA > aprB ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [orderBy, direction, filteredTokensInfo, chainId]);

  return sortedTokensInfo;
}

function MarketTokenListItem({
  marketInfo,
  market,
  isFavorite,
  onFavorite,
  handleSelectToken,
  isSmallMobile,
  mintableInfo,
  sellableInfo,
  rowVerticalPadding,
  indexName,
  poolName,
  tdClassName,
  apr,
  incentiveApr,
  lidoApr,
}: {
  marketInfo: MarketInfo;
  market: TokenData;
  isFavorite: boolean;
  onFavorite: (address: string) => void;
  handleSelectToken: (address: string) => void;
  isSmallMobile: boolean;
  mintableInfo: ReturnType<typeof getMintableMarketTokens | typeof getMintableInfoGlv>;
  sellableInfo: ReturnType<typeof getSellableMarketToken | typeof getSellableInfoGlv>;
  rowVerticalPadding: string;
  indexName?: string;
  poolName?: string;
  tdClassName: string;
  apr: bigint | undefined;
  incentiveApr: bigint | undefined;
  lidoApr: bigint | undefined;
}) {
  const { indexToken, longToken, shortToken } = marketInfo;
  const iconName = marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const handleFavoriteClick = useCallback(() => onFavorite(market.address), [market.address, onFavorite]);

  const handleSelect = useCallback(() => handleSelectToken(market.address), [handleSelectToken, market.address]);

  const formattedMintableUsd = isSmallMobile
    ? formatAmountHuman(mintableInfo?.mintableUsd, USD_DECIMALS, true)
    : formatUsd(mintableInfo?.mintableUsd, {
        displayDecimals: 0,
        fallbackToZero: true,
      });

  const formattedSellableAmount = isSmallMobile
    ? formatAmountHuman(sellableInfo?.totalAmount, market?.decimals, true)
    : formatTokenAmount(sellableInfo?.totalAmount, market?.decimals, market?.symbol, {
        displayDecimals: 0,
        useCommas: true,
      });

  return (
    <tr key={market.address} className="group/row cursor-pointer hover:bg-cold-blue-900">
      <td
        className={cx("rounded-4 pl-15 pr-4 hover:bg-cold-blue-700", rowVerticalPadding)}
        onClick={handleFavoriteClick}
      >
        <FavoriteStar isFavorite={isFavorite} />
      </td>
      <td className={cx("rounded-4 pl-6", rowVerticalPadding, isSmallMobile ? "pr-6" : "pr-15")} onClick={handleSelect}>
        {marketInfo && !isSmallMobile && (
          <div className="inline-flex items-center">
            <TokenIcon className="-my-5 mr-8" symbol={iconName} displaySize={16} importSize={40} />
            <div className="inline-flex flex-wrap items-center">
              <span className="text-slate-100">{indexName && indexName}</span>
              <span className="ml-3 text-12 leading-1 text-gray-300">{poolName && `[${poolName}]`}</span>
            </div>
          </div>
        )}
        {marketInfo && isSmallMobile && (
          <div className="inline-flex flex-col items-start">
            <TokenIcon symbol={iconName} displaySize={16} importSize={40} />
            <span>{indexName && indexName}</span>
            <span className="text-12 leading-1 text-gray-300">{poolName && `[${poolName}]`}</span>
          </div>
        )}
      </td>
      <td className={tdClassName} onClick={handleSelect}>
        {formattedMintableUsd}
      </td>
      <td className={tdClassName} onClick={handleSelect}>
        {formattedSellableAmount}
      </td>
      <td className={tdClassName} onClick={handleSelect}>
        <AprInfo
          apy={apr}
          incentiveApr={incentiveApr}
          lidoApr={lidoApr}
          showTooltip={false}
          tokenAddress={market.address}
        />
      </td>
    </tr>
  );
}
