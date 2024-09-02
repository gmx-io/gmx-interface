import { Trans, t } from "@lingui/macro";
import noop from "lodash/noop";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { Address, isAddress, isAddressEqual } from "viem";
import { useAccount } from "wagmi";

import usePagination from "components/Referrals/usePagination";
import { getIcons } from "config/icons";
import { getNormalizedTokenSymbol } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectChainId,
  selectGlvInfoLoading,
  selectGlvAndGmMarketsData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  GlvAndGmMarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getTotalGmInfo,
  useMarketTokensData,
  getGlvMarketShortening,
} from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { sortGmTokensByField } from "./sortGmTokensByField";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import Pagination from "components/Pagination/Pagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers, type SortDirection } from "components/Sorter/Sorter";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getMintableInfoGlv, isGlv } from "domain/synthetics/markets/glv";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../OrderList/ExchangeTable";
import { ApyTooltipContent } from "./ApyTooltipContent";
import { MintableAmount } from "./MintableAmount";
import { TokenValuesInfoCell } from "./TokenValuesInfoCell";
import { GmTokensBalanceInfo, GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";

type Props = {
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  shouldScrollToTop?: boolean;
  isDeposit: boolean;
};

const tokenAddressStyle = { fontSize: 5 };

export type SortField = "price" | "totalSupply" | "buyable" | "wallet" | "apy" | "unspecified";

export function GmList({
  marketsTokensApyData,
  glvMarketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectGlvAndGmMarketsData);
  const glvsLoading = useSelector(selectGlvInfoLoading);
  const tokensData = useTokensData();
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit });
  const { isConnected: active } = useAccount();
  const currentIcons = getIcons(chainId);
  const userEarnings = useUserEarnings(chainId);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>();
  const [searchText, setSearchText] = useState("");
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const shiftAvailableMarketAddressSet = useMemo(
    () => new Set(shiftAvailableMarkets.map((m) => m.marketTokenAddress)),
    [shiftAvailableMarkets]
  );

  const isLoading = !marketsInfo || !marketTokensData || glvsLoading;

  const filteredGmTokens = useFilterSortPools({
    marketsInfo,
    marketTokensData,
    orderBy,
    direction,
    glvMarketsTokensApyData,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    searchText,
    tokensData,
  });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    filteredGmTokens,
    10
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  return (
    <div
      className="rounded-4 bg-slate-800
                   max-[1164px]:!-mr-[--default-container-padding] max-[1164px]:!rounded-r-0
                   max-[600px]:!-mr-[--default-container-padding-mobile]"
    >
      <div className="flex items-center px-14 py-10">
        <span className="text-16">
          <Trans>Pools</Trans>
        </span>
        <img src={currentIcons.network} width="16" className="ml-5 mr-10" alt="Network Icon" />
        <SearchInput
          size="s"
          value={searchText}
          setValue={handleSearch}
          className="*:!text-16"
          placeholder="Search Pool"
          onKeyDown={noop}
          autoFocus={false}
        />
      </div>
      <div className="h-1 bg-slate-700"></div>
      <div className="overflow-x-auto">
        <table className="w-[max(100%,1100px)]">
          <thead>
            <ExchangeTheadTr bordered={false}>
              <ExchangeTh>
                <Trans>POOL</Trans>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("price")}>
                  <Trans>PRICE</Trans>
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("totalSupply")}>
                  <Trans>TOTAL SUPPLY</Trans>
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("buyable")}>
                  <TooltipWithPortal
                    handle={<Trans>BUYABLE</Trans>}
                    className="normal-case"
                    position="bottom-end"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>Available amount to deposit into the specific GM pool.</Trans>
                      </p>
                    )}
                  />
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("wallet")}>
                  <GmTokensTotalBalanceInfo
                    balance={userTotalGmInfo?.balance}
                    balanceUsd={userTotalGmInfo?.balanceUsd}
                    userEarnings={userEarnings}
                    label={t`WALLET`}
                  />
                </Sorter>
              </ExchangeTh>
              <ExchangeTh>
                <Sorter {...getSorterProps("apy")}>
                  <TooltipWithPortal
                    handle={t`APY`}
                    className="normal-case"
                    position="bottom-end"
                    renderContent={ApyTooltipContent}
                  />
                </Sorter>
              </ExchangeTh>

              <ExchangeTh />
            </ExchangeTheadTr>
          </thead>
          <tbody>
            {currentData.length > 0 &&
              currentData.map((token) => (
                <GmListItem
                  key={token.address}
                  token={token}
                  marketTokensData={marketTokensData}
                  marketsTokensApyData={marketsTokensApyData}
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  glvMarketsTokensApyData={glvMarketsTokensApyData}
                  shouldScrollToTop={shouldScrollToTop}
                  isShiftAvailable={token.symbol === "GLV" ? false : shiftAvailableMarketAddressSet.has(token.address)}
                />
              ))}
            {!currentData.length && !isLoading && (
              <ExchangeTr hoverable={false} bordered={false}>
                <ExchangeTd colSpan={7}>
                  <div className="text-center text-gray-400">
                    <Trans>No GM pools found.</Trans>
                  </div>
                </ExchangeTd>
              </ExchangeTr>
            )}
            {isLoading && <GMListSkeleton />}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <>
          <div className="h-1 bg-slate-700"></div>
          <div className="py-10">
            <Pagination topMargin={false} page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
          </div>
        </>
      )}
    </div>
  );
}

function useFilterSortPools({
  marketsInfo,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvMarketsTokensApyData,
  searchText,
  tokensData,
}: {
  marketsInfo: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
  searchText: string;
  tokensData: TokensData | undefined;
}) {
  const chainId = useSelector(selectChainId);

  const sortedTokens = useMemo(() => {
    if (!marketsInfo || !marketTokensData) {
      return [];
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortGmTokensDefault(marketsInfo, marketTokensData);
    }

    return sortGmTokensByField({
      chainId,
      marketsInfo,
      marketTokensData,
      orderBy,
      direction,
      marketsTokensApyData,
      marketsTokensIncentiveAprData,
      marketsTokensLidoAprData,
      glvMarketsTokensApyData,
    });
  }, [
    chainId,
    direction,
    marketTokensData,
    marketsInfo,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvMarketsTokensApyData,
    marketsTokensLidoAprData,
    orderBy,
  ]);

  const filteredTokens = useMemo(() => {
    if (!searchText.trim()) {
      return sortedTokens;
    }

    return sortedTokens.filter((token) => {
      const market = getByKey(marketsInfo, token?.address)!;
      const indexToken = isGlv(market)
        ? market.indexToken
        : getTokenData(tokensData, market?.indexTokenAddress, "native");
      const longToken = getTokenData(tokensData, market?.longTokenAddress);
      const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

      if (!market || !indexToken || !longToken || !shortToken) {
        return false;
      }

      const poolName = market.name;

      const indexSymbol = indexToken.symbol;
      const indexName = indexToken.name;

      const longSymbol = longToken.symbol;
      const longName = longToken.name;

      const shortSymbol = shortToken.symbol;
      const shortName = shortToken.name;

      const marketTokenAddress = market.marketTokenAddress;
      const indexTokenAddress = market.indexTokenAddress;
      const longTokenAddress = market.longTokenAddress;
      const shortTokenAddress = market.shortTokenAddress;

      return (
        poolName.toLowerCase().includes(searchText.toLowerCase()) ||
        indexSymbol.toLowerCase().includes(searchText.toLowerCase()) ||
        indexName.toLowerCase().includes(searchText.toLowerCase()) ||
        longSymbol.toLowerCase().includes(searchText.toLowerCase()) ||
        longName.toLowerCase().includes(searchText.toLowerCase()) ||
        shortSymbol.toLowerCase().includes(searchText.toLowerCase()) ||
        shortName.toLowerCase().includes(searchText.toLowerCase()) ||
        (isAddress(searchText) &&
          (isAddressEqual(marketTokenAddress as Address, searchText) ||
            isAddressEqual(indexTokenAddress as Address, searchText) ||
            isAddressEqual(longTokenAddress as Address, searchText) ||
            isAddressEqual(shortTokenAddress as Address, searchText)))
      );
    });
  }, [marketsInfo, searchText, sortedTokens, tokensData]);

  return filteredTokens;
}

function GmListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvMarketsTokensApyData,
  shouldScrollToTop,
  isShiftAvailable,
  marketTokensData,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
  shouldScrollToTop: boolean | undefined;
  isShiftAvailable: boolean;
  marketTokensData: TokensData | undefined;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectGlvAndGmMarketsData);
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId);
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { showDebugValues } = useSettings();

  const market = getByKey(marketsInfoData, token?.address)!;

  const isGlvMarket = isGlv(market);

  const indexToken = isGlvMarket ? market.indexToken : getTokenData(tokensData, market?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  const mintableInfo = useMemo(() => {
    if (!market || !token || isGlvMarket) {
      return undefined;
    }

    return getMintableMarketTokens(market, token);
  }, [market, token, isGlvMarket]);

  const shiftButton = useMemo(() => {
    const btn = (
      <Button
        className={cx("w-full", {
          "!opacity-30": !isShiftAvailable,
        })}
        variant="secondary"
        disabled={!isShiftAvailable}
        to={`/pools/?market=${market.marketTokenAddress}&operation=shift&scroll=${shouldScrollToTop ? "1" : "0"}`}
      >
        <Trans>Shift</Trans>
      </Button>
    );

    if (isGlvMarket) {
      return (
        <TooltipWithPortal
          content={
            <Trans>
              Shifting from GLV to another pool is not possible, as GLV can only be sold into individual tokens.
              However, you can buy GLV tokens without incurring buying fees by using eligible GM pool tokens.
            </Trans>
          }
          handle={btn}
          disableHandleStyle
        />
      );
    }

    return (
      <TooltipWithPortal
        disabled={isShiftAvailable}
        content={t`Shift is only applicable to GM pools when there are other pools with the same backing tokens, allowing liquidity to be moved without incurring buy or sell fees.`}
        disableHandleStyle
        handleClassName="block"
        position="bottom-end"
      >
        {btn}
      </TooltipWithPortal>
    );
  }, [isShiftAvailable, market.marketTokenAddress, shouldScrollToTop, isGlvMarket]);

  const apy = isGlvMarket
    ? getByKey(glvMarketsTokensApyData, market.indexToken.address)
    : getByKey(marketsTokensApyData, token?.address);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, token?.address);
  const lidoApr = getByKey(marketsTokensLidoAprData, token?.address);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

  if (!token || !indexToken || !longToken || !shortToken) {
    return null;
  }

  const totalSupply = token?.totalSupply;
  const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
  const tokenIconName = market.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const tokenIconBadge = market.isSpotOnly
    ? undefined
    : isGlvMarket
      ? getGlvMarketShortening(chainId, market.indexTokenAddress)
      : ([market.longToken.symbol, market.shortToken.symbol] as const);

  return (
    <ExchangeTr key={token.address} hoverable={false} bordered={false}>
      <ExchangeTd>
        <div className="flex">
          <div className="mr-12 flex shrink-0 items-center">
            <TokenIcon
              symbol={tokenIconName}
              displaySize={40}
              importSize={40}
              badge={tokenIconBadge}
              className="min-h-40 min-w-40"
            />
          </div>
          <div>
            <div className="flex text-16">
              {isGlvMarket ? `GLV: ${market.name}` : getMarketIndexName({ indexToken, isSpotOnly: market?.isSpotOnly })}

              <div className="inline-block">
                <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
              </div>
            </div>
            <div className="text-12 tracking-normal text-gray-400">
              [{getMarketPoolName({ longToken, shortToken })}]
            </div>
          </div>
        </div>
        {showDebugValues && <span style={tokenAddressStyle}>{market.marketTokenAddress}</span>}
      </ExchangeTd>
      <ExchangeTd>{formatUsdPrice(token.prices?.minPrice)}</ExchangeTd>
      <ExchangeTd>
        <TokenValuesInfoCell
          token={formatTokenAmount(totalSupply, token.decimals, token.symbol, {
            useCommas: true,
            displayDecimals: 2,
          })}
          usd={formatUsd(totalSupplyUsd)}
        />
      </ExchangeTd>
      <ExchangeTd>
        {isGlvMarket ? (
          <MintableAmount mintableInfo={getMintableInfoGlv(market, marketTokensData)} market={market} token={token} />
        ) : (
          <MintableAmount
            mintableInfo={mintableInfo}
            market={market}
            token={token}
            longToken={longToken}
            shortToken={shortToken}
          />
        )}
      </ExchangeTd>

      <ExchangeTd>
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
          isGlv={isGlvMarket}
        />
      </ExchangeTd>

      <ExchangeTd>
        <AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} tokenAddress={token.address} />
      </ExchangeTd>

      <ExchangeTd className="w-[350px]">
        <div className="grid grid-cols-3 gap-10">
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${market.marketTokenAddress}&operation=buy&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Buy</Trans>
          </Button>
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${market.marketTokenAddress}&operation=sell&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Sell</Trans>
          </Button>
          <div className="flex-grow">{shiftButton}</div>
        </div>
      </ExchangeTd>
    </ExchangeTr>
  );
}
