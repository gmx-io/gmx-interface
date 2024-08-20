import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import { Address, isAddress, isAddressEqual } from "viem";
import { useAccount } from "wagmi";

import usePagination from "components/Referrals/usePagination";
import { getIcons } from "config/icons";
import { getNormalizedTokenSymbol } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxPoolUsd,
  getMintableMarketTokens,
  getPoolUsdWithoutPnl,
  getTotalGmInfo,
  useMarketTokensData,
} from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatTokenAmountWithUsd, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { sortGmTokensByField } from "./sortGmTokensByField";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GmTokensBalanceInfo, GmTokensTotalBalanceInfo } from "components/GmTokensBalanceInfo/GmTokensBalanceInfo";
import Pagination from "components/Pagination/Pagination";
import SearchInput from "components/SearchInput/SearchInput";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers, type SortDirection } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { ExchangeTd, ExchangeTh, ExchangeTheadTr, ExchangeTr } from "../OrderList/ExchangeTable";

type Props = {
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
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
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

  const isLoading = !marketsInfoData || !marketTokensData;

  const filteredGmTokens = useFilterSortGmPools({
    marketsInfoData,
    marketTokensData,
    orderBy,
    direction,
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
          <Trans>GM Pools</Trans>
        </span>
        <img src={currentIcons.network} width="16" className="ml-5 mr-10" alt="Network Icon" />
        <SearchInput
          size="s"
          value={searchText}
          setValue={handleSearch}
          className="*:!text-16"
          placeholder="Search Market"
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
                <Trans>MARKET</Trans>
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
                  marketsTokensApyData={marketsTokensApyData}
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  shouldScrollToTop={shouldScrollToTop}
                  isShiftAvailable={shiftAvailableMarketAddressSet.has(token.address)}
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

function useFilterSortGmPools({
  marketsInfoData,
  marketTokensData,
  orderBy,
  direction,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  searchText,
  tokensData,
}: {
  marketsInfoData: MarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
  orderBy: SortField;
  direction: SortDirection;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  searchText: string;
  tokensData: TokensData | undefined;
}) {
  const chainId = useSelector(selectChainId);

  const sortedGmTokens = useMemo(() => {
    if (!marketsInfoData || !marketTokensData) {
      return [];
    }

    if (orderBy === "unspecified" || direction === "unspecified") {
      return sortGmTokensDefault(marketsInfoData, marketTokensData);
    }

    return sortGmTokensByField({
      chainId,
      marketsInfoData,
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
    marketsInfoData,
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    orderBy,
  ]);

  const filteredGmTokens = useMemo(() => {
    if (!searchText.trim()) {
      return sortedGmTokens;
    }

    return sortedGmTokens.filter((token) => {
      const market = getByKey(marketsInfoData, token?.address)!;
      const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
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
  }, [marketsInfoData, searchText, sortedGmTokens, tokensData]);

  return filteredGmTokens;
}

function GmListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isShiftAvailable,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  shouldScrollToTop: boolean | undefined;
  isShiftAvailable: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId);
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { showDebugValues } = useSettings();

  const market = getByKey(marketsInfoData, token?.address)!;

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
  const mintableInfo = market && token ? getMintableMarketTokens(market, token) : undefined;

  const apy = getByKey(marketsTokensApyData, token?.address);
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

  return (
    <ExchangeTr key={token.address} hoverable={false} bordered={false}>
      <ExchangeTd>
        <div className="flex">
          <div className="mr-8 flex shrink-0 items-center">
            <TokenIcon symbol={tokenIconName} displaySize={40} importSize={40} className="min-h-40 min-w-40" />
          </div>
          <div>
            <div className="flex text-16">
              {getMarketIndexName({ indexToken, isSpotOnly: market?.isSpotOnly })}

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
        {formatTokenAmount(totalSupply, token.decimals, "GM", {
          useCommas: true,
          displayDecimals: 2,
        })}
        <br />({formatUsd(totalSupplyUsd)})
      </ExchangeTd>
      <ExchangeTd>
        <MintableAmount
          mintableInfo={mintableInfo}
          market={market}
          token={token}
          longToken={longToken}
          shortToken={shortToken}
        />
      </ExchangeTd>

      <ExchangeTd>
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          oneLine={false}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
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

          <TooltipWithPortal
            disabled={isShiftAvailable}
            content={t`Shift is only applicable to GM pools when there are other pools with the same backing tokens, allowing liquidity to be moved without incurring buy or sell fees.`}
            disableHandleStyle
            handleClassName="block"
            position="bottom-end"
          >
            <Button
              className={cx("w-full", {
                "!opacity-30": !isShiftAvailable,
              })}
              variant="secondary"
              to={`/pools/?market=${market.marketTokenAddress}&operation=shift&scroll=${shouldScrollToTop ? "1" : "0"}`}
              disabled={!isShiftAvailable}
            >
              <Trans>Shift</Trans>
            </Button>
          </TooltipWithPortal>
        </div>
      </ExchangeTd>
    </ExchangeTr>
  );
}

function MintableAmount({
  mintableInfo,
  market,
  token,
  longToken,
  shortToken,
}: {
  mintableInfo:
    | {
        mintableAmount: bigint;
        mintableUsd: bigint;
        longDepositCapacityUsd: bigint;
        shortDepositCapacityUsd: bigint;
        longDepositCapacityAmount: bigint;
        shortDepositCapacityAmount: bigint;
      }
    | undefined;
  market: any;
  token: any;
  longToken: any;
  shortToken: any;
}) {
  const longTokenMaxValue = useMemo(
    () => [
      mintableInfo
        ? formatTokenAmountWithUsd(
            mintableInfo.longDepositCapacityAmount,
            mintableInfo.longDepositCapacityUsd,
            longToken.symbol,
            longToken.decimals
          )
        : "-",
      `(${formatUsd(getPoolUsdWithoutPnl(market, true, "midPrice"))} / ${formatUsd(getMaxPoolUsd(market, true))})`,
    ],
    [longToken.decimals, longToken.symbol, market, mintableInfo]
  );
  const shortTokenMaxValue = useMemo(
    () => [
      mintableInfo
        ? formatTokenAmountWithUsd(
            mintableInfo.shortDepositCapacityAmount,
            mintableInfo.shortDepositCapacityUsd,
            shortToken.symbol,
            shortToken.decimals
          )
        : "-",
      `(${formatUsd(getPoolUsdWithoutPnl(market, false, "midPrice"))} / ${formatUsd(getMaxPoolUsd(market, false))})`,
    ],
    [market, mintableInfo, shortToken.decimals, shortToken.symbol]
  );

  return (
    <TooltipWithPortal
      maxAllowedWidth={350}
      handle={
        <>
          {formatTokenAmount(mintableInfo?.mintableAmount, token.decimals, "GM", {
            useCommas: true,
            displayDecimals: 0,
          })}
          <br />(
          {formatUsd(mintableInfo?.mintableUsd, {
            displayDecimals: 0,
          })}
          )
        </>
      }
      className="normal-case"
      position="bottom-end"
      renderContent={() => (
        <>
          <p className="text-white">
            {market?.isSameCollaterals ? (
              <Trans>{longToken.symbol} can be used to buy GM for this market up to the specified buying caps.</Trans>
            ) : (
              <Trans>
                {longToken.symbol} and {shortToken.symbol} can be used to buy GM for this market up to the specified
                buying caps.
              </Trans>
            )}
          </p>
          <br />
          <StatsTooltipRow label={`Max ${longToken.symbol}`} value={longTokenMaxValue} />
          <StatsTooltipRow label={`Max ${shortToken.symbol}`} value={shortTokenMaxValue} />
        </>
      )}
    />
  );
}

function ApyTooltipContent() {
  return (
    <p className="text-white">
      <Trans>
        <p className="mb-12">
          The APY is an estimate based on the fees collected for the past seven days, extrapolating the current
          borrowing fee. It excludes:
        </p>
        <ul className="mb-8 list-disc">
          <li className="p-2">price changes of the underlying token(s)</li>
          <li className="p-2">traders' PnL, which is expected to be neutral in the long term</li>
          <li className="p-2">funding fees, which are exchanged between traders</li>
        </ul>
        <p className="mb-12">
          <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
            Read more about GM token pricing
          </ExternalLink>
          .
        </p>
        <p>
          Check GM pools' performance against other LP Positions in the{" "}
          <ExternalLink href="https://dune.com/gmx-io/gmx-analytics">GMX Dune Dashboard</ExternalLink>.
        </p>
      </Trans>
    </p>
  );
}
