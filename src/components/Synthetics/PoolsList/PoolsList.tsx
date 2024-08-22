import { Trans, t } from "@lingui/macro";
import noop from "lodash/noop";
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
  selectPoolsData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  PoolsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getTotalGmInfo,
  useMarketTokensData,
} from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { sortPoolsTokensByField } from "./sortPoolsTokensByField";
import { sortPoolsTokensDefault } from "./sortPoolsTokensDefault";

import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import Pagination from "components/Pagination/Pagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers, type SortDirection } from "components/Sorter/Sorter";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getBuyableAmountGlv, getGlvMarketBadgeName, isGlv } from "domain/synthetics/markets/glv";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../OrderList/ExchangeTable";
import { ApyTooltipContent } from "./ApyTooltipContent";
import { MintableAmount } from "./MintableAmount";
import { TokenValuesInfoCell } from "./TokenValuesInfoCell";
import { TokensBalanceInfo, TokensTotalBalanceInfo } from "./TokensBalanceInfo";

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

export function PoolsList({
  marketsTokensApyData,
  glvMarketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const poolsInfo = useSelector(selectPoolsData);
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

  const isLoading = !poolsInfo || !marketTokensData || glvsLoading;

  const filteredGmTokens = useFilterSortPools({
    poolsInfo,
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
                  <TokensTotalBalanceInfo
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
                <PoolsListItem
                  key={token.address}
                  token={token}
                  marketsTokensApyData={marketsTokensApyData}
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  glvMarketsTokensApyData={glvMarketsTokensApyData}
                  shouldScrollToTop={shouldScrollToTop}
                  hideShift={token.symbol === "GLV" ? false : shiftAvailableMarketAddressSet.has(token.address)}
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
  poolsInfo,
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
  poolsInfo: PoolsInfoData | undefined;
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
    if (!poolsInfo || !marketTokensData) {
      return [];
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortPoolsTokensDefault(poolsInfo, marketTokensData);
    }

    return sortPoolsTokensByField({
      chainId,
      poolsInfo,
      marketTokensData,
      orderBy,
      direction,
      marketsTokensApyData,
      marketsTokensIncentiveAprData,
      marketsTokensLidoAprData,
    });
  }, [
    chainId,
    direction,
    marketTokensData,
    poolsInfo,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    orderBy,
  ]);

  const filteredTokens = useMemo(() => {
    if (!searchText.trim()) {
      return sortedTokens;
    }

    return sortedTokens.filter((token) => {
      const market = getByKey(poolsInfo, token?.address)!;
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
  }, [poolsInfo, searchText, sortedTokens, tokensData]);

  return filteredTokens;
}

function PoolsListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvMarketsTokensApyData,
  shouldScrollToTop,
  hideShift,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvMarketsTokensApyData: MarketTokensAPRData | undefined;
  shouldScrollToTop: boolean | undefined;
  hideShift: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectPoolsData);
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
    if (hideShift) {
      return null;
    }

    const btn = (
      <Button
        className="w-full"
        variant="secondary"
        disabled={isGlvMarket}
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

    return btn;
  }, [hideShift, market.marketTokenAddress, shouldScrollToTop, isGlvMarket]);

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

  const tokenIconBadge = isGlvMarket
    ? getGlvMarketBadgeName(market.name)
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
          token={formatTokenAmount(totalSupply, token.decimals, "GM", {
            useCommas: true,
            displayDecimals: 2,
          })}
          usd={formatUsd(totalSupplyUsd)}
        />
      </ExchangeTd>
      <ExchangeTd>
        {isGlvMarket ? (
          <MintableAmount mintableInfo={getBuyableAmountGlv(market)} market={market} token={token} />
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
        <TokensBalanceInfo
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
        <div className="flex flex-wrap gap-10">
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
