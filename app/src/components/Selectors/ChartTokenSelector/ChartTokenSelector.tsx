import SearchInput from '@/components/Common/Input/SearchInput';
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileList,
  useSelectorClose,
} from '@/components/Common/SelectorBase/SelectorBase';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { useTokenLiquidity } from '@/components/Selectors/ChartTokenSelector/hooks/useTokenLiquidity';
import { useTokenSearch } from '@/components/Selectors/ChartTokenSelector/hooks/useTokenSearch';
import {
  SortField,
  useTokenSorting,
} from '@/components/Selectors/ChartTokenSelector/hooks/useTokenSorting';
import { ONE_USD } from '@/config/constants';
import { useIndexTokensDataForMarketSelector } from '@/hooks/marketHooks/useIndexTokensDataForMarketSelector';
import { useMarketToken24hVolumes } from '@/hooks/statsHooks/useMarketToken24hVolumes';
import { selectAvailableChartTokens } from '@/selectors/chart/selectAvailableChartTokens';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { makeSelectIndexTokensStatForMarketSelector } from '@/selectors/stats/makeSelectIndexTokensStatForMarketSelector';
import { MarketTokensStat } from '@/selectors/stats/types';
import { TokenData } from '@/selectors/token/types';
import { TradeType } from '@/selectors/trade/types';
import { selectTradeboxChooseSuitableMarket } from '@/selectors/tradebox/selectTradeboxChooseSuitableMarket';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import {
  formatPercentage,
  formatPriceUsd,
  formatTokenAmount,
  formatUsdToKMB,
} from '@/utils/legacy/format';
import { helperToast } from '@/utils/lib/helperToast';
import { getByKey } from '@/utils/lib/object';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { PublicKey } from '@solana/web3.js';
import classNames from 'classnames';
import { useCallback, useMemo } from 'react';
import { FaPause, FaPlay } from 'react-icons/fa';
import { useMedia } from 'react-use';

interface TokenSelectorData {
  indexToken: TokenData;
  maxLongLiquidityPool?: {
    maxLongLiquidity: BN;
  };
  maxShortLiquidityPool?: {
    maxShortLiquidity: BN;
  };
  lastPrice?: BN;
  longOIValue: string;
  shortOIValue: string;
  change24h: number;
  volume24h: BN;
  maxLeverage?: BN;
  liquidityAmount?: string;
  liquidityValue?: string;
}

export function ChartTokenSelectorContent({
  marketsStat,
}: {
  marketsStat: MarketTokensStat;
}) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isCompactLayout = useMedia('(width <= 1300px) and (width > 700px)');
  const isExtraSmall = useMedia('(max-width: 600px)');
  const { isSwap } = useAppStore(selectTradeboxTradeFlags);
  const chooseSuitableMarket = useAppStore(selectTradeboxChooseSuitableMarket);
  const availableIndexTokens = useAppStore(selectAvailableChartTokens);
  const { marketVolumesData } = useMarketToken24hVolumes();
  const indexTokensStats = useAppStore(
    useMemo(
      () => makeSelectIndexTokensStatForMarketSelector(marketVolumesData),
      [marketVolumesData]
    )
  );

  const marketsInfo = useAppStore(selectMarketsInfo);

  const { searchKeyword, filteredTokens, handleSearchChange } =
    useTokenSearch(availableIndexTokens);
  const { sortField, sortDirection, handleSort } = useTokenSorting();
  const { calculateTokenLiquidity } = useTokenLiquidity();

  const { indexTokenData } = useIndexTokensDataForMarketSelector({
    searchKeyword,
    sortField,
    sortDirection,
    isMobile,
  });

  // Process and sort indexTokenData
  const sortedIndexTokenData = useMemo(() => {
    // First, process the data based on mode (swap or non-swap)
    const processedData = indexTokenData.filter((data) => data?.indexToken);

    if (isSwap) {
      // For swap mode: add liquidity data
      return processedData
        .map((data) => {
          const liquidity = calculateTokenLiquidity(
            data.indexToken,
            marketsInfo
          );
          return {
            ...data,
            liquidityAmount: formatTokenAmount(
              liquidity.amount,
              data.indexToken.decimals,
              data.indexToken.symbol,
              {
                useCommas: true,
                displayDecimals: 0,
                maxThreshold: '10000000',
                minThreshold: '1',
              }
            ),
            liquidityValue: formatUsdToKMB(liquidity.value),
            liquidityValueBN: liquidity.value, // Used for sorting
          };
        })
        .sort((a, b) => b.liquidityValueBN.cmp(a.liquidityValueBN)); // Sort by liquidity value
    }

    // For non-swap mode: the data is already processed by useIndexTokensDataForMarketSelector
    // We don't need to do additional processing here, just return the data
    return processedData;
  }, [indexTokenData, marketsInfo, isSwap, calculateTokenLiquidity]);

  const handleMarketSelect = useCallback(
    (tokenAddress: PublicKey) => {
      const addressString = tokenAddress.toBase58();

      const chosenMarket = chooseSuitableMarket(
        addressString,
        'largestPosition'
      );

      if (
        chosenMarket?.marketTokenAddress &&
        chosenMarket.tradeType !== TradeType.Swap
      ) {
        const marketStat = getByKey(
          marketsStat,
          chosenMarket.marketTokenAddress
        );
        const nextTradeType = chosenMarket.tradeType;
        if (marketStat) {
          const indexName = getMarketIndexName(marketStat.marketInfo);
          const poolName = getMarketPoolName(marketStat.marketInfo);
          helperToast.info(
            <Trans>
              <span>
                {nextTradeType === TradeType.Long ? t`Long` : t`Short`}
              </span>{' '}
              <div className="inline-flex items-center">
                <span>{indexName}</span>
                <span className="text-xs text-slate-400">[{poolName}]</span>
              </div>{' '}
              <span>market selected</span>
            </Trans>
          );
        }
      }
    },
    [chooseSuitableMarket, marketsStat]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && filteredTokens && filteredTokens.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleMarketSelect(filteredTokens[0].address);
      }
    },
    [filteredTokens, handleMarketSelect]
  );

  return (
    <>
      <div className={`${isMobile ? 'px-0 pt-0' : 'px-10 pt-10'}`}>
        <SearchInput
          className="*:!text-body-medium mb-0"
          value={searchKeyword}
          setValue={handleSearchChange}
          placeholder={isSwap ? t`Search Token` : t`Search Market`}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isMobile ? (
        <ChartSelectorMobile
          sortedIndexTokenData={sortedIndexTokenData as TokenSelectorData[]}
          isSwap={isSwap}
          isExtraSmall={isExtraSmall}
          handleTokenSelect={handleMarketSelect}
          indexTokensStats={indexTokensStats}
        />
      ) : (
        <ChartTokenSelectorDesktop
          sortedIndexTokenData={sortedIndexTokenData as TokenSelectorData[]}
          isSwap={isSwap}
          isCompactLayout={isCompactLayout}
          sortField={sortField}
          sortDirection={sortDirection}
          handleSort={handleSort}
          handleTokenSelect={handleMarketSelect}
          indexTokensStats={indexTokensStats}
        />
      )}
    </>
  );
}

export function ChartTokenSelector({
  chartToken,
  marketsStat,
}: {
  chartToken?: TokenData;
  marketsStat: MarketTokensStat;
}) {
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const { isSwap } = useAppStore(selectTradeboxTradeFlags);

  const selectorLabel = (
    <div className="mr-2 flex items-center gap-5">
      {chartToken && (
        <>
          <TokenIcon
            symbol={chartToken.symbol}
            displaySize={isMobile ? 20 : 30}
            importSize={isMobile ? 24 : 40}
            className="relative overflow-hidden rounded-full"
          />
          <div className={isMobile ? 'text-body-medium' : 'text-body-large'}>
            {chartToken.symbol} / USD
          </div>
        </>
      )}
    </div>
  );

  return (
    <SelectorBase
      label={selectorLabel}
      modalLabel={isSwap ? t`Select Token` : t`Select Market`}
      popoverXOffset={-18}
      popoverYOffset={10}
      mobileModalContentPadding={true}
      chevronStyle="compact"
      chevronSize={20}
    >
      <ChartTokenSelectorContent marketsStat={marketsStat} />
    </SelectorBase>
  );
}

function ChartTokenSelectorDesktop({
  sortedIndexTokenData,
  isSwap,
  isCompactLayout,
  sortField,
  sortDirection,
  handleSort,
  handleTokenSelect,
  indexTokensStats,
}: {
  sortedIndexTokenData: TokenSelectorData[];
  isSwap: boolean;
  isCompactLayout: boolean;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: Exclude<SortField, null>) => void;
  handleTokenSelect: (tokenAddress: PublicKey) => void;
  indexTokensStats: Record<string, { gtEnabledForIndexToken: boolean }>;
}) {
  const close = useSelectorClose();

  return (
    <Table className="text-body-medium w-full">
      <thead>
        <TableTheadTr>
          <TableTh className="text-body-medium">
            <Trans>{isSwap ? 'TOKEN' : 'MARKET'}</Trans>
          </TableTh>
          {!isSwap && (
            <>
              <TableTh className="text-body-medium">
                <Trans>LAST PRICE</Trans>
              </TableTh>
              {!isCompactLayout ? (
                <>
                  <TableTh
                    className="cursor-pointer select-none hover:text-primary-300"
                    onClick={() => {
                      console.log('Clicked on 24H% column');
                      handleSort('change24h');
                    }}
                  >
                    <span className="inline-flex items-center">
                      <Trans>24H%</Trans>
                      {sortField === 'change24h' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </TableTh>
                  <TableTh
                    className="cursor-pointer select-none hover:text-primary-300"
                    onClick={() => {
                      console.log('Clicked on 24H VOL column');
                      handleSort('volume24h');
                    }}
                  >
                    <span className="inline-flex items-center">
                      <Trans>24H VOL</Trans>
                      {sortField === 'volume24h' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </TableTh>
                </>
              ) : null}
              <TableTh className="text-body-medium">
                <Trans>OPEN INTEREST</Trans>
              </TableTh>
              <TableTh className="text-body-medium">
                <Trans>LIQUIDITY</Trans>
              </TableTh>
              <TableTh className="text-center">
                <Trans>GT</Trans>
              </TableTh>
            </>
          )}
          {isSwap && (
            <>
              <TableTh className="text-body-medium">
                <Trans>LIQ. AMOUNT</Trans>
              </TableTh>
              <TableTh className="text-body-medium text-right">
                <Trans>LIQ. VALUE</Trans>
              </TableTh>
            </>
          )}
        </TableTheadTr>
      </thead>
      <tbody>
        {sortedIndexTokenData.map((data) => (
          <ChartListItemDesktop
            key={data.indexToken.symbol}
            data={data}
            isSwap={isSwap}
            isCompactLayout={isCompactLayout}
            onSelect={() => {
              handleTokenSelect(data.indexToken.address);
              close();
            }}
            gtEnabled={
              indexTokensStats[data.indexToken.address.toBase58()]
                ?.gtEnabledForIndexToken || false
            }
          />
        ))}
      </tbody>
    </Table>
  );
}

function svgIcon(type: 'rise' | 'fall') {
  return type === 'rise' ? (
    <svg
      height="9.856"
      viewBox="0 0 15.704 9.856"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
      class="relative top-1 opacity-70"
    >
      <path
        d="m529-488.59v5.67l-2.113-2.109-5.326 5.319-2.924-2.921-3.9 3.9-1.444-1.448 5.341-5.341 2.924 2.924 3.882-3.882-2.113-2.109z"
        fill="currentColor"
        transform="translate(-513.3 488.59)"
      ></path>
    </svg>
  ) : (
    <svg
      height="9.856"
      viewBox="0 0 15.704 9.856"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
      class="relative opacity-70"
    >
      <path
        d="m0 0v5.67l2.113-2.11 5.326 5.32 2.924-2.921 3.9 3.9 1.437-1.451-5.337-5.341-2.924 2.924-3.882-3.882 2.113-2.109z"
        fill="currentColor"
        transform="matrix(-1 0 0 -1 15.704 9.856)"
      ></path>
    </svg>
  );
}

function ChartListItemDesktop({
  data,
  isSwap,
  isCompactLayout,
  onSelect,
  gtEnabled,
}: {
  data: TokenSelectorData;
  isSwap: boolean;
  isCompactLayout: boolean;
  onSelect: () => void;
  gtEnabled: boolean;
}) {
  return (
    <SelectorBaseDesktopRow
      onClick={onSelect}
      className="hover:bg-dark-blue-100 active:bg-dark-blue-200"
    >
      <TableTd className="text-body-medium">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TokenIcon
              symbol={data.indexToken.symbol}
              displaySize={20}
              importSize={24}
              className="relative overflow-hidden rounded-full"
            />
            <span>
              {data.indexToken.symbol}
              {!isSwap && '/USD'}
            </span>
            {!isSwap && (
              <span className="text-body-small rounded-4 ml-1 bg-slate-700 px-5">
                {data.maxLeverage
                  ? `${data.maxLeverage.div(ONE_USD).toNumber()}X`
                  : 'N/A'}
              </span>
            )}
          </div>
          {isCompactLayout && !isSwap && (
            <div className="text-body-small text-gray-300">
              {formatUsdToKMB(data.volume24h)}
            </div>
          )}
        </div>
      </TableTd>
      {!isSwap && (
        <>
          <TableTd className="text-body-medium">
            <div className="flex flex-col gap-1">
              <div>
                {data.lastPrice ? formatPriceUsd(data.lastPrice) : 'N/A'}
              </div>
              {isCompactLayout && (
                <div
                  className={classNames('text-xs', {
                    'text-green-500': data.change24h > 0,
                    'text-red-500': data.change24h < 0,
                  })}
                >
                  {formatPercentage(data.change24h, 2, { signed: true })}
                </div>
              )}
            </div>
          </TableTd>
          {!isCompactLayout && (
            <>
              <TableTd
                className={classNames('text-body-medium', {
                  'text-green-500': data.change24h > 0,
                  'text-red-500': data.change24h < 0,
                })}
              >
                {formatPercentage(data.change24h, 2, { signed: true })}
              </TableTd>
              <TableTd className="text-body-medium">
                {formatUsdToKMB(data.volume24h)}
              </TableTd>
            </>
          )}
          <TableTd className="text-body-medium">
            <div className="flex flex-col">
              <div className="flex items-center">
                {svgIcon('rise')}&nbsp;{data.longOIValue}
              </div>
              <div className="flex items-center">
                {svgIcon('fall')}&nbsp;{data.shortOIValue}
              </div>
            </div>
          </TableTd>
          <TableTd className="text-body-medium">
            <div className="flex flex-col">
              <div className="flex items-center">
                {svgIcon('rise')}&nbsp;
                {data.maxLongLiquidityPool
                  ? formatUsdToKMB(data.maxLongLiquidityPool.maxLongLiquidity)
                  : 'N/A'}
              </div>
              <div className="flex items-center">
                {svgIcon('fall')}&nbsp;
                {data.maxShortLiquidityPool
                  ? formatUsdToKMB(data.maxShortLiquidityPool.maxShortLiquidity)
                  : 'N/A'}
              </div>
            </div>
          </TableTd>
          <TableTd className="text-center">
            {gtEnabled ? (
              <FaPlay className="mx-auto text-green-500" />
            ) : (
              <FaPause className="mx-auto text-red-500" />
            )}
          </TableTd>
        </>
      )}
      {isSwap && (
        <>
          <TableTd className="text-body-medium">{data.liquidityAmount}</TableTd>
          <TableTd className="text-body-medium text-right">
            {data.liquidityValue}
          </TableTd>
        </>
      )}
    </SelectorBaseDesktopRow>
  );
}

function ChartSelectorMobile({
  sortedIndexTokenData,
  isSwap,
  isExtraSmall,
  handleTokenSelect,
  indexTokensStats,
}: {
  sortedIndexTokenData: TokenSelectorData[];
  isSwap: boolean;
  isExtraSmall: boolean;
  handleTokenSelect: (tokenAddress: PublicKey) => void;
  indexTokensStats: Record<string, { gtEnabledForIndexToken: boolean }>;
}) {
  const close = useSelectorClose();

  const handleSelect = (tokenAddress: PublicKey) => {
    handleTokenSelect(tokenAddress);
    close();
  };

  const gridColsClass = isSwap
    ? 'grid-cols-[1.5fr_1fr_1fr]'
    : isExtraSmall
      ? 'grid-cols-[2fr_2fr_1fr]'
      : 'grid-cols-[2fr_1fr_1fr_1fr]';

  return (
    <div className="animate-slide-up">
      <SelectorBaseMobileList>
        <div
          className={`text-body-medium mt-5 grid h-[30px] ${gridColsClass} items-center gap-2 px-5 text-slate-300`}
        >
          <div className="text-left">
            <Trans>{isSwap ? 'TOKEN' : 'MARKET'}</Trans>
          </div>
          {!isSwap && (
            <>
              <div className="text-left">
                <Trans>LAST PRICE</Trans>
              </div>
              {!isExtraSmall && (
                <div className="text-right">
                  <Trans>24H%</Trans>
                </div>
              )}
              <div className="text-right">
                <Trans>VOL</Trans>
              </div>
            </>
          )}
          {isSwap && (
            <>
              <div className="text-left">
                <Trans>LIQ. AMOUNT</Trans>
              </div>
              <div className="text-right">
                <Trans>LIQ. VALUE</Trans>
              </div>
            </>
          )}
        </div>
        {sortedIndexTokenData.map((data) => {
          const gtEnabled =
            indexTokensStats[data.indexToken.address.toBase58()]
              ?.gtEnabledForIndexToken || false;

          return (
            <div
              key={data.indexToken.symbol}
              className={`text-body-medium hover:bg-dark-blue-100 active:bg-dark-blue-200 rounded-4 grid cursor-pointer ${gridColsClass} items-center gap-2 p-5`}
              onClick={() => handleSelect(data.indexToken.address)}
            >
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <TokenIcon
                  symbol={data.indexToken.symbol}
                  displaySize={20}
                  importSize={24}
                  className="relative overflow-hidden rounded-full"
                />
                <span className="overflow-hidden text-ellipsis">
                  {data.indexToken.symbol}
                  {!isSwap && '/USD'}
                </span>
                {!isSwap && (
                  <>
                    {!isExtraSmall && (
                      <span className="text-body-small rounded-4 ml-1 bg-slate-700 px-2">
                        {data.maxLeverage
                          ? `${data.maxLeverage.div(ONE_USD).toNumber()}X`
                          : 'N/A'}
                      </span>
                    )}
                    <span
                      className={classNames(
                        'text-body-small rounded-4 ml-1 px-2',
                        {
                          'bg-slate-700 text-red-500': !gtEnabled,
                          'bg-green-900 text-green-500': gtEnabled,
                        }
                      )}
                    >
                      GT
                    </span>
                  </>
                )}
              </div>
              {!isSwap && (
                <>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {data.lastPrice ? formatPriceUsd(data.lastPrice) : 'N/A'}
                  </div>
                  {!isExtraSmall && (
                    <div
                      className={classNames('text-right', {
                        'text-green-500': data.change24h > 0,
                        'text-red-500': data.change24h < 0,
                      })}
                    >
                      {formatPercentage(data.change24h, 2, { signed: true })}
                    </div>
                  )}
                  <div className="text-right">
                    {formatUsdToKMB(data.volume24h)}
                  </div>
                </>
              )}
              {isSwap && (
                <>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {data.liquidityAmount}
                  </div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-right">
                    {data.liquidityValue}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </SelectorBaseMobileList>
    </div>
  );
}
