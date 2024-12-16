import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import partition from "lodash/partition";
import { useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { useMedia } from "react-use";

import { USD_DECIMALS } from "config/factors";
import { getMarketListingDate } from "config/markets";
import { getCategoryTokenAddresses, getNormalizedTokenSymbol } from "config/tokens";
import {
  GlvAndGmMarketsInfoData,
  GlvOrMarketInfo,
  MarketTokensAPRData,
  getGlvDisplayName,
  getGlvMarketShortening,
  getGlvMarketSubtitle,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { getIsBaseApyReadyToBeShown } from "domain/synthetics/markets/getIsBaseApyReadyToBeShown";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { TokenFavoritesTabOption, useTokensFavorites } from "domain/synthetics/tokens/useTokensFavorites";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { formatAmountHuman, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { searchBy } from "lib/searchBy";

import { AprInfo } from "components/AprInfo/AprInfo";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import SearchInput from "components/SearchInput/SearchInput";
import { SortDirection, Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTr } from "components/Table/Table";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { getMintableInfoGlv, getTotalSellableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

type Props = {
  chainId: number;
  marketsInfoData?: GlvAndGmMarketsInfoData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  marketsTokensLidoAprData?: MarketTokensAPRData;
  glvTokensIncentiveAprData?: MarketTokensAPRData;
  glvTokensApyData?: MarketTokensAPRData;
  currentMarketInfo?: GlvOrMarketInfo;
};

export default function MarketTokenSelector(props: Props) {
  const {
    chainId,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    marketsTokensAPRData,
    marketsInfoData,
    marketTokensData,
    currentMarketInfo,
    glvTokensApyData,
  } = props;
  const indexName = currentMarketInfo && getMarketIndexName(currentMarketInfo);
  const poolName = currentMarketInfo && getMarketPoolName(currentMarketInfo);

  const isGlv = currentMarketInfo && isGlvInfo(currentMarketInfo);

  const iconName = currentMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(currentMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(currentMarketInfo.shortToken.symbol)
    : isGlv
      ? currentMarketInfo?.glvToken.symbol
      : currentMarketInfo?.indexToken.symbol;

  return (
    <SelectorBase
      handleClassName="inline-block"
      popoverYOffset={18}
      popoverXOffset={-8}
      popoverPlacement="bottom-start"
      chevronClassName="!-mt-1 self-start"
      label={
        <div className="inline-flex items-center">
          {currentMarketInfo ? (
            <>
              <TokenIcon
                symbol={iconName}
                displaySize={30}
                importSize={40}
                badge={
                  isGlv
                    ? getGlvMarketShortening(chainId, getGlvOrMarketAddress(currentMarketInfo))
                    : ([currentMarketInfo.longToken.symbol, currentMarketInfo.shortToken.symbol] as const)
                }
              />
              <div className="ml-16">
                <div className="flex items-center text-16">
                  {isGlv ? (
                    <span>{getGlvDisplayName(currentMarketInfo)}</span>
                  ) : (
                    <span>GM{indexName && `: ${indexName}`}</span>
                  )}
                  <span className="ml-3 text-12 text-slate-100 group-hover/selector-base:text-[color:inherit]">
                    {poolName && `[${poolName}]`}
                  </span>
                </div>
                <div className="text-12 text-slate-100 group-hover/selector-base:text-[color:inherit]">
                  {isGlv
                    ? getGlvMarketSubtitle(chainId, getGlvOrMarketAddress(currentMarketInfo))
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
        glvTokensIncentiveAprData={glvTokensIncentiveAprData}
        marketsTokensAPRData={marketsTokensAPRData}
        marketsTokensLidoAprData={marketsTokensLidoAprData}
        marketsInfoData={marketsInfoData}
        marketTokensData={marketTokensData}
        currentMarketInfo={currentMarketInfo}
        glvTokensApyData={glvTokensApyData}
      />
    </SelectorBase>
  );
}

type SortField = "buyable" | "sellable" | "apy" | "unspecified";

function MarketTokenSelectorInternal(props: Props) {
  const {
    chainId,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    marketsTokensAPRData,
    marketsInfoData,
    marketTokensData,
    glvTokensApyData,
  } = props;
  const { markets: sortedMarketsByIndexToken } = useSortedPoolsWithIndexToken(marketsInfoData, marketTokensData);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchKeyword, setSearchKeyword] = useState("");
  const history = useHistory();

  const { tab, favoriteTokens, toggleFavoriteToken } = useTokensFavorites("gm-token-selector");

  const sortedTokensInfo = useFilterSortTokensInfo({
    chainId,
    sortedMarketsByIndexToken,
    searchKeyword,
    tab,
    marketsInfoData,
    favoriteTokens,
    marketsTokensAPRData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvTokensApyData,
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

  const rowVerticalPadding = isMobile ? "py-8" : cx("h-50 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isMobile ? cx("px-6 first-of-type:pl-8 last-of-type:pr-8") : "px-16";
  const thClassName = cx(
    "text-body-medium sticky top-0 z-10 border-b border-slate-700 bg-slate-800 text-left font-normal uppercase text-slate-100 last-of-type:text-right",
    isMobile ? "first-of-type:!pl-32" : "first-of-type:!pl-40",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx("text-body-medium last-of-type:text-right", rowVerticalPadding, rowHorizontalPadding);

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
        <div className="mt-16 flex flex-col gap-8">
          <SearchInput
            className="w-full *:!text-body-medium"
            value={searchKeyword}
            setValue={setSearchKeyword}
            onKeyDown={handleKeyDown}
            placeholder="Search Pool"
          />

          <ButtonRowScrollFadeContainer>
            <FavoriteTabs favoritesKey="gm-token-selector" />
          </ButtonRowScrollFadeContainer>
        </div>
      </SelectorBaseMobileHeaderContent>
      <div
        className={cx({
          "w-[650px]": !isMobile,
        })}
      >
        {!isMobile && (
          <>
            <div className="m-16 flex justify-between gap-16">
              <SearchInput
                className="w-full *:!text-body-medium"
                value={searchKeyword}
                setValue={setSearchKeyword}
                onKeyDown={handleKeyDown}
                placeholder="Search Pool"
              />
              <FavoriteTabs favoritesKey="gm-token-selector" />
            </div>
          </>
        )}

        <div
          className={cx({
            "max-h-[444px] overflow-y-auto": !isMobile,
          })}
        >
          <table className="w-full border-separate border-spacing-0">
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
                  onFavorite={toggleFavoriteToken}
                  handleSelectToken={handleSelectToken}
                  isMobile={isMobile}
                  rowVerticalPadding={rowVerticalPadding}
                />
              ))}
              {sortedMarketsByIndexToken.length > 0 && !sortedTokensInfo?.length && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={6} className="text-body-medium text-slate-100">
                    <Trans>No pools matched.</Trans>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </table>
        </div>
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
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvTokensApyData,
  orderBy,
  direction,
}: {
  chainId: number;
  sortedMarketsByIndexToken: TokenData[];
  searchKeyword: string;
  tab: TokenFavoritesTabOption;
  marketTokensData: TokensData | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  favoriteTokens: string[];
  marketsTokensAPRData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  glvTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
  orderBy: SortField;
  direction: SortDirection;
}) {
  const filteredTokensInfo = useMemo(() => {
    if (sortedMarketsByIndexToken.length < 1) {
      return [];
    }

    const textMatched = searchKeyword.trim()
      ? searchBy(
          sortedMarketsByIndexToken,
          [
            (item) => {
              const marketInfo = getByKey(marketsInfoData, item?.address)!;
              return isGlvInfo(marketInfo) ? getGlvDisplayName(marketInfo) : marketInfo.name;
            },
          ],
          searchKeyword
        )
      : sortedMarketsByIndexToken;

    let tabMatched = textMatched;

    if (tab === "all") {
      tabMatched = textMatched;
    } else if (tab === "favorites") {
      tabMatched = tabMatched.filter((item) => favoriteTokens?.includes(item.address));
    } else {
      const categoryTokenAddresses = getCategoryTokenAddresses(chainId, tab);
      tabMatched = tabMatched.filter((item) => {
        const marketInfo = getByKey(marketsInfoData, item?.address)!;

        if (isGlvInfo(marketInfo)) {
          return false;
        }

        return categoryTokenAddresses.includes(marketInfo.indexTokenAddress);
      });
    }

    return tabMatched.map((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;

      const isGlv = isGlvInfo(marketInfo);

      const mintableInfo = isGlv
        ? getMintableInfoGlv(marketInfo, marketTokensData)
        : getMintableMarketTokens(marketInfo, market);
      const sellableInfo = isGlv
        ? getTotalSellableInfoGlv(marketInfo, marketsInfoData, marketTokensData)
        : getSellableMarketToken(marketInfo, market);
      const apr = getByKey(isGlv ? glvTokensApyData : marketsTokensAPRData, market?.address);
      const incentiveApr = getByKey(
        isGlv ? glvTokensIncentiveAprData : marketsTokensIncentiveAprData,
        getGlvOrMarketAddress(marketInfo)
      );
      const lidoApr = getByKey(marketsTokensLidoAprData, getGlvOrMarketAddress(marketInfo));
      const indexName = isGlv ? getGlvDisplayName(marketInfo) : getMarketIndexName(marketInfo);
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
    sortedMarketsByIndexToken,
    searchKeyword,
    tab,
    marketsInfoData,
    favoriteTokens,
    chainId,
    marketTokensData,
    glvTokensApyData,
    marketsTokensAPRData,
    glvTokensIncentiveAprData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
  ]);

  const sortedTokensInfo = useMemo(() => {
    const [favorites, nonFavorites] = partition(filteredTokensInfo, (token) =>
      favoriteTokens.includes(token.market.address)
    );

    const comparator = marketSortingComparatorBuilder({ chainId, orderBy, direction });

    const sortedFavorites = favorites.sort(comparator);
    const sortedNonFavorites = nonFavorites.sort(comparator);

    return [...sortedFavorites, ...sortedNonFavorites];
  }, [orderBy, direction, filteredTokensInfo, chainId, favoriteTokens]);

  return sortedTokensInfo;
}

function MarketTokenListItem({
  marketInfo,
  market,
  isFavorite,
  onFavorite,
  handleSelectToken,
  isMobile,
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
  marketInfo: GlvOrMarketInfo;
  market: TokenData;
  isFavorite: boolean;
  onFavorite: (address: string) => void;
  handleSelectToken: (address: string) => void;
  isMobile: boolean;
  mintableInfo: ReturnType<typeof getMintableMarketTokens | typeof getMintableInfoGlv>;
  sellableInfo: ReturnType<typeof getSellableMarketToken | typeof getTotalSellableInfoGlv>;
  rowVerticalPadding: string;
  indexName?: string;
  poolName?: string;
  tdClassName: string;
  apr: bigint | undefined;
  incentiveApr: bigint | undefined;
  lidoApr: bigint | undefined;
}) {
  const { longToken, shortToken } = marketInfo;
  const iconName = marketInfo.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(isGlvInfo(marketInfo) ? marketInfo.glvToken.symbol : marketInfo.indexToken.symbol);

  const handleFavoriteClick = useCallback(() => onFavorite(market.address), [market.address, onFavorite]);

  const handleSelect = useCallback(() => handleSelectToken(market.address), [handleSelectToken, market.address]);

  const formattedMintableUsd = isMobile
    ? formatAmountHuman(mintableInfo?.mintableUsd, USD_DECIMALS, true)
    : formatUsd(mintableInfo?.mintableUsd, {
        displayDecimals: 0,
        fallbackToZero: true,
      });

  const formattedSellableAmount = isMobile
    ? formatAmountHuman(sellableInfo?.totalAmount, market?.decimals, true)
    : formatTokenAmount(sellableInfo?.totalAmount, market?.decimals, market?.symbol, {
        displayDecimals: 0,
        useCommas: true,
      });

  return (
    <tr key={market.address} className="group/row cursor-pointer hover:bg-cold-blue-900">
      <td className={cx("pr-4", rowVerticalPadding, isMobile ? "pl-8" : "pl-16")} onClick={handleFavoriteClick}>
        <FavoriteStar isFavorite={isFavorite} />
      </td>
      <td className={cx("pl-6", rowVerticalPadding, isMobile ? "pr-6" : "pr-16")} onClick={handleSelect}>
        {marketInfo && (
          <div className="inline-flex items-center">
            <TokenIcon className="-my-5 mr-8" symbol={iconName} displaySize={16} importSize={40} />
            <div className="inline-flex flex-wrap items-center gap-x-3 whitespace-nowrap">
              <span className="text-body-medium text-white">{indexName && indexName}</span>
              <span className="text-body-small leading-1 text-slate-100">{poolName && `[${poolName}]`}</span>
            </div>
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
          marketAddress={market.address}
        />
      </td>
    </tr>
  );
}

function marketSortingComparatorBuilder({
  chainId,
  orderBy,
  direction,
}: {
  chainId: number;
  orderBy: SortField;
  direction: SortDirection;
}) {
  const directionMultiplier = direction === "asc" ? 1 : -1;

  return (
    a: {
      mintableInfo: { mintableUsd: bigint };
      sellableInfo: { totalAmount: bigint };
      incentiveApr: bigint | undefined;
      apr: bigint | undefined;
      marketInfo: GlvOrMarketInfo;
    },
    b: {
      mintableInfo: { mintableUsd: bigint };
      sellableInfo: { totalAmount: bigint };
      incentiveApr: bigint | undefined;
      apr: bigint | undefined;
      marketInfo: GlvOrMarketInfo;
    }
  ) => {
    if (orderBy === "unspecified" || direction === "unspecified") {
      return 0;
    }

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
      if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, getGlvOrMarketAddress(a.marketInfo)))) {
        aprA += a.apr ?? 0n;
      }

      let aprB = b.incentiveApr ?? 0n;
      if (getIsBaseApyReadyToBeShown(getMarketListingDate(chainId, getGlvOrMarketAddress(b.marketInfo)))) {
        aprB += b.apr ?? 0n;
      }

      return aprA > aprB ? directionMultiplier : -directionMultiplier;
    }

    return 0;
  };
}
