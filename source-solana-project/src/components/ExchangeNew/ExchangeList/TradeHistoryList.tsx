import ExternalLink from '@/components/Common/Link/ExternalLink';
import { getGmw216Enabled } from '@/config/featureFlagEnable';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { BN_ZERO, ONE_USD } from '@/config/constants';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_GLV_MARKET_TOKENS, GMX_SOLANA_GLV_METAL_MARKET_TOKENS, GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS } from '@/config/program';
import { NEW_EXCHANGE_LIST_PER_PAGE } from '@/config/ui';
import { useTradeHistoryData } from '@/hooks/statsHooks/useTradeHistoryData';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import externalIcon from '@/img/external.svg';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { getUnit } from '@/utils/legacy/common';
import {
  formatPriceUsd,
  formatTimestamp,
  formatUsd,
  formatParseUsdToBN,
} from '@/utils/legacy/format';
import { getAddressUrl } from '@/utils/lib/explorer';
import { getIconUrlPath } from '@/utils/lib/icon';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useMedia } from 'react-use';
import { useShallow } from 'zustand/react/shallow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import FilterIcon from '@/img/Filter.svg?react';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import {
  useMarketFilterData,
  useMarketFilter,
} from '@/components/ExchangeNew/ExchangeList/components/MarketFliter';
import { Popover } from '@headlessui/react';
import {
  autoUpdate,
  flip,
  offset,
  useFloating,
  FloatingPortal,
} from '@floating-ui/react';
import FilterBox from '@/components/Common/FilterBox/FilterBox';
import { useDateRangeFilter } from '@/hooks/utilsHooks/useDateRangeFilter';
import LoadingComponent from '@/utils/LoadingComponent';
import { getTableEmptyStateClass } from '@/config/tableHeights';
import { OrderType } from '@/selectors/order/types';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];
const formatMintGT = (
  paidBorrowingFee?: BN,
  mintingCost?: BN,
  decimals?: number
) => {
  if (!mintingCost || !paidBorrowingFee) return '0.00';

  const amount = formatAmount(paidBorrowingFee.div(mintingCost), decimals, 2);
  return Number(amount) < 0.01 ? '< 0.01' : amount;
};

const MIN_USD_THRESHOLD = ONE_USD.div(new BN(100)); // $0.01

const formatUsdWithMinDisplay = (value: BN): string => {
  if (value.isZero()) return '$0.00';
  const absValue = value.abs();
  if (absValue.lt(MIN_USD_THRESHOLD)) {
    return value.isNeg() ? '- <$0.01' : '+ <$0.01';
  }
  return formatUsd(value, { signed: true }) || '$0.00';
};

interface TradeHistoryListProps {
  dateRange?: Value;
}

export function TradeHistoryList({ dateRange }: TradeHistoryListProps) {
  const { historyItems, isLoading } = useTradeHistoryData();
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const mintingCost = store?.gt?.mintingCost;
  const gtDecimals = store?.gt?.decimals;
  // const { historySwapItems, isLoadingSwap } = useSwapHistoryData();
  const marketsInfo = useAppStore(selectMarketsInfo);
  const isScreenSmall = useMedia('(max-width: 1100px)');
  const isMobileView = useMedia('(max-width: 768px)');
  const [page, setPage] = useState(1);
  const { markets } = useAppStore(
    useShallow((state) => ({
      markets: state.markets.markets,
    }))
  );

  // Market filter state
  const [selectedMarketKeys, setSelectedMarketKeys] = useState<string[]>([]);
  const marketFilterData = useMarketFilterData();
  const { filterByMarket } = useMarketFilter(selectedMarketKeys);

  // Floating UI for market filter popover
  const marketPopover = useFloating({
    placement: 'bottom-start',
    middleware: [offset(4), flip()],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    setPage(1);
  }, [isMobileView]);

  useEffect(() => {
    setPage(1);
  }, [selectedMarketKeys]);


  // useMemo(() => {
  //   console.log('historyItems=========', historyItems);
  // }, [historyItems])

  // Apply date range filter
  const dateFilteredItems = useDateRangeFilter(historyItems, dateRange);

  // Helper function to convert kind string to OrderType
  const getOrderTypeFromKind = (kind: string): OrderType | undefined => {
    switch (kind) {
      case 'MarketSwap':
        return OrderType.MarketSwap;
      case 'LimitSwap':
        return OrderType.LimitSwap;
      case 'MarketIncrease':
        return OrderType.MarketIncrease;
      case 'MarketDecrease':
        return OrderType.MarketDecrease;
      case 'LimitIncrease':
        return OrderType.LimitIncrease;
      case 'LimitDecrease':
        return OrderType.LimitDecrease;
      case 'StopLossDecrease':
        return OrderType.StopLossDecrease;
      case 'Liquidation':
        return OrderType.Liquidation;
      case 'AutoDeleveraging':
        return OrderType.AutoDeleveraging;
      default:
        return undefined;
    }
  };

  const sortedHistory = useMemo(() => {
    // Apply market filter
    const filtered = dateFilteredItems.filter((item) => {
      // Convert trade history item to match the filter interface
      const orderType = getOrderTypeFromKind(item.kind);
      return filterByMarket({
        marketTokenAddress: item.marketToken,
        isLong: item.isLong,
        orderType,
        // positionAddress: item.marketToken,
      });
    });

    // Then sort by timestamp
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [dateFilteredItems, filterByMarket]);

  const itemsPerPage = isMobileView ? 25 : NEW_EXCHANGE_LIST_PER_PAGE;

  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedHistory.slice(startIndex, endIndex);
  }, [sortedHistory, page, itemsPerPage]);

  const pageCount = Math.ceil(sortedHistory.length / itemsPerPage);

  const getActionLabel = (kind: string) => {
    switch (kind) {
      case 'Liquidation':
        return t`Liquidation`;
      case 'AutoDeleveraging':
        return t`Auto Deleveraging`;
      case 'MarketSwap':
        return t`Market Swap`;
      case 'MarketIncrease':
        return t`Market Increase`;
      case 'MarketDecrease':
        return t`Market Decrease`;
      case 'LimitSwap':
        return t`Limit Swap`;
      case 'LimitIncrease':
        return t`Limit Increase`;
      case 'LimitDecrease':
        return t`Take-Profit`;
      case 'StopLossDecrease':
        return t`Stop-Loss`;
      default:
        return kind;
    }
  };

  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );

  // if (isScreenSmall) {
  //   return (
  //     <div>
  //       {sortedHistory.length === 0 && (
  //         <div className="App-card text-center text-gray-400">
  //           {isLoading ? t`Loading...` : t`No trade history available`}
  //         </div>
  //       )}
  //       <div className="grid grid-cols-1 gap-10 min-[800px]:grid-cols-2">
  //         {!isLoading &&
  //           currentPageItems.map((item) => {
  //             const marketInfo = marketsInfo[item.marketToken.toString()];
  //             if (!marketInfo) return null;

  //             return (
  //               <div key={item.id} className="App-card">
  //                 <div className="App-card-title">
  //                   <div className="flex items-center gap-4">
  //                     <img
  //                       className="size-20"
  //                       src={getIconUrlPath(marketInfo.indexToken.symbol, 40)}
  //                       alt={getMarketIndexName(marketInfo)}
  //                     />
  //                     <span>{getMarketIndexName(marketInfo)}</span>
  //                   </div>
  //                 </div>

  //                 <div className="App-card-divider" />

  //                 <div className="grid gap-10">
  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Action</Trans>
  //                     </div>
  //                     <div>
  //                       <div className="flex items-end gap-5 text-[1.3rem]">
  //                         {getActionLabel(item.kind)}
  //                         <ExternalLink
  //                           href={getAddressUrl(item.order)}
  //                           className="mb-[0px] inline-flex hover:opacity-80"
  //                           onClick={(e) => {
  //                             e.preventDefault();
  //                             e.stopPropagation();
  //                             window.open(
  //                               getAddressUrl(item.order),
  //                               '_blank',
  //                               'noopener,noreferrer'
  //                             );
  //                           }}
  //                         >
  //                           <img
  //                             src={externalIcon}
  //                             alt="View in explorer"
  //                             width={12}
  //                             height={12}
  //                           />
  //                         </ExternalLink>
  //                       </div>
  //                     </div>
  //                   </div>

  //                   {/* <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Direction</Trans>
  //                     </div>
  //                     <div
  //                       className={classNames('text-sm', {
  //                         'text-green-500': item.isLong,
  //                         'text-red-500': !item.isLong,
  //                       })}
  //                     >
  //                       {item.isLong ? 'Long' : 'Short'}
  //                     </div>
  //                   </div> */}

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Market</Trans>
  //                     </div>
  //                     <div className="flex items-center gap-5">
  //                       <span>{getMarketIndexName(marketInfo)}</span>
  //                       <span className="subtext">
  //                         [{getMarketPoolName(marketInfo)}]
  //                       </span>
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Size</Trans>
  //                     </div>
  //                     <div>{formatUsd(item.size, { displayPlus: true })}</div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Execution Price</Trans>
  //                     </div>
  //                     <div>
  //                       {formatPriceUsd(
  //                         item.executionPrice.mul(
  //                           getUnit(marketInfo.indexToken.decimals)
  //                         )
  //                       )}
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Price Impact</Trans>
  //                     </div>
  //                     <div
  //                       className={classNames({
  //                         'text-green-500': item.priceImpact.gt(BN_ZERO),
  //                         'text-red-500': item.priceImpact.lt(BN_ZERO),
  //                       })}
  //                     >
  //                       {item.priceImpact.eq(BN_ZERO)
  //                         ? '-'
  //                         : formatUsd(item.priceImpact, {
  //                             signed: true,
  //                           })}
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Realized PnL</Trans>
  //                     </div>
  //                     <div
  //                       className={classNames({
  //                         'text-green-500': item.pnl.gt(BN_ZERO),
  //                         'text-red-500': item.pnl.lt(BN_ZERO),
  //                       })}
  //                     >
  //                       {item.pnl.eq(BN_ZERO)
  //                         ? '-'
  //                         : formatUsd(item.pnl, {
  //                             signed: true,
  //                           })}
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Time</Trans>
  //                     </div>
  //                     <div>{formatTimestamp(item.timestamp, 'calendar')}</div>
  //                   </div>
  //                 </div>
  //               </div>
  //             );
  //           })}
  //       </div>
  //       <BottomTablePagination
  //         page={page}
  //         pageCount={pageCount}
  //         onPageChange={setPage}
  //       />
  //     </div>
  //   );
  // }

  return (
    <div className="Exchange-list-container">
      <div className="Exchange-list-table-wrapper">
        <TableScrollFadeContainer>
          <div className={getTableEmptyStateClass('tradePrimary')}>
            <Table>
              <thead className="text-body-medium">
                <TableTheadTr>
                  <TableTh
                    style={{
                      paddingLeft: '2rem',
                      fontSize: '1.1rem',
                      color: '#A3A3A3',
                    }}
                  >
                    <Trans>ACTION</Trans>
                  </TableTh>
                  {/* <TableTh>
                  <Trans>Direction</Trans>
                </TableTh> */}
                  <TableTh style={{ color: '#A3A3A3' }}>
                    <div className="flex items-center gap-4">
                      <span
                        style={{
                          fontSize: '1.1rem',
                          color:
                            selectedMarketKeys.length > 0
                              ? '#FA7B4E'
                              : '#A3A3A3',
                        }}
                      >
                        <Trans>MARKET</Trans>
                      </span>
                      {/* <Popover style={{ paddingTop: '0.4rem' }}>
                        {({ open }) => (
                          <>
                            <Popover.Button
                              className="cursor-pointer hover:opacity-70"
                              ref={marketPopover.refs.setReference}
                            >
                              <FilterIcon
                                width={16}
                                height={16}
                                fill={
                                  selectedMarketKeys.length > 0
                                    ? '#FA7B4E'
                                    : '#A3A3A3'
                                }
                              />
                            </Popover.Button>
                            {open && (
                              <FloatingPortal>
                                <Popover.Panel
                                  static
                                  ref={marketPopover.refs.setFloating}
                                  style={marketPopover.floatingStyles}
                                  className="z-1000 rounded-4 relative overflow-hidden border border-gray-800 bg-slate-800"
                                >
                                  <FilterBox
                                    treeData={marketFilterData}
                                    selectedKeys={selectedMarketKeys}
                                    onChange={setSelectedMarketKeys}
                                    searchPlaceholder="Search Market"
                                    maxHeight="26rem"
                                  />
                                </Popover.Panel>
                              </FloatingPortal>
                            )}
                          </>
                        )}
                      </Popover> */}
                    </div>
                  </TableTh>
                  <TableTh
                    style={{ fontSize: '1.1rem', color: '#A3A3A3' }}
                    className="text-right"
                  >
                    <Trans>SIZE</Trans>
                  </TableTh>
                  <TableTh
                    style={{
                      fontSize: '1.1rem',
                      color: '#A3A3A3',
                    }}
                    className="text-right"
                  >
                    <Trans>PRICE</Trans>
                  </TableTh>
                  {/* <TableTh>
                  <Trans>Price Impact</Trans>
                </TableTh> */}
                  <TableTh
                    style={{
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content',
                      color: '#A3A3A3',
                    }}
                    className="text-right"
                  >
                    <Trans>RPNL</Trans>
                  </TableTh>
                  <TableTh
                    style={{
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content',
                      color: '#A3A3A3',
                    }}
                    className="text-right"
                  >
                    <Trans>FEES</Trans>
                  </TableTh>
                  <TableTh
                    style={{
                      paddingRight: '2rem',
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap',
                      color: '#A3A3A3',
                    }}
                    className="text-right"
                  >
                    <Trans>MINT GT</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {!isLoading &&
                  currentPageItems.map((item) => {
                    // const marketInfo = marketsInfo[item.marketToken.toString()];
                    const marketToken = markets.filter((token) => {
                      return (
                        token.marketToken.toString() ===
                        item.marketToken.toString()
                      );
                    });
                    let marketInfo = {};
                    if (!marketToken || !marketToken.length) return null;
                    marketInfo = marketToken[0];
                    const tokenSymbol = GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol?.toLowerCase();
                    const isRwaMarket = GMX_SOLANA_GLV_MARKET_TOKENS.includes(tokenSymbol) || GMX_SOLANA_GLV_METAL_MARKET_TOKENS.includes(tokenSymbol) || GMX_SOLANA_GLV_METAL_RWA_COMMODITY_TOKENS.includes(tokenSymbol);
                    const feeRateDecimals = isRwaMarket ? 4 : 3;

                    const isIncreaseType = [
                      'MarketIncrease',
                      'LimitIncrease',
                    ].includes(item.kind);
                    const isDecreaseType = [
                      'MarketDecrease',
                      'LimitDecrease',
                      'StopLossDecrease',
                      'Liquidation',
                    ].includes(item.kind);
                    const isTradeType = isIncreaseType || isDecreaseType;

                    let pnlBN: BN | null = null;
                    let totalFees: BN = BN_ZERO;
                    interface FeeDetailItem {
                      label?: string;
                      value?: BN;
                      orderFeePctStr?: string;
                    }
                    let feesDetail: FeeDetailItem[] = [];

                    if (isTradeType) {
                      const toBN = (v: any) => new BN(v || 0);
                      const longTokenPrice = toBN(item.longTokenPrice || 0);
                      const shortTokenPrice = toBN(item.shortTokenPrice || 0);
                      const collateralTokenPrice = item.isCollateralLong
                        ? longTokenPrice
                        : shortTokenPrice;

                      const feesOrderFeeForReceiverAmount = toBN(
                        item.feesOrderFeeForReceiverAmount
                      );
                      const feesOrderFeeForPoolAmount = toBN(
                        item.feesOrderFeeForPoolAmount
                      );
                      const orderFeeUSD = feesOrderFeeForReceiverAmount
                        .add(feesOrderFeeForPoolAmount)
                        .mul(collateralTokenPrice);

                      const feesTotalBorrowingFeeAmount = toBN(
                        item.feesTotalBorrowingFeeAmount
                      );
                      const borrowingFeeUSD =
                        feesTotalBorrowingFeeAmount.mul(collateralTokenPrice);

                      const feesFundingFeeAmount = toBN(
                        item.feesFundingFeeAmount
                      );
                      const negativeFundingFeeUSD =
                        feesFundingFeeAmount.mul(collateralTokenPrice);

                      const feesClaimableFundingFeeLongTokenAmount = toBN(
                        item.feesClaimableFundingFeeLongTokenAmount
                      );
                      const feesClaimableFundingFeeShortTokenAmount = toBN(
                        item.feesClaimableFundingFeeShortTokenAmount
                      );
                      const positiveFundingFeeUSD =
                        feesClaimableFundingFeeLongTokenAmount
                          .mul(longTokenPrice)
                          .add(
                            feesClaimableFundingFeeShortTokenAmount.mul(
                              shortTokenPrice
                            )
                          );

                      const feesLiquidationFeeAmount = toBN(
                        item.feesLiquidationFeeAmount
                      );
                      const liquidationFeeUSD =
                        feesLiquidationFeeAmount.mul(collateralTokenPrice);

                      // Build fees detail
                      let orderFeePctStr: string | undefined;
                      if (!getGmw216Enabled()) {
                        const sizeDeltaUsd = toBN(item.size).abs();
                        const precisionMultiplier = new BN(Math.pow(10, feeRateDecimals + 2));
                        const scaledFeeRate = sizeDeltaUsd.isZero()
                          ? new BN(0)
                          : orderFeeUSD.mul(precisionMultiplier).div(sizeDeltaUsd);
                        const divisor = Math.pow(10, feeRateDecimals);
                        if (scaledFeeRate.isZero()) {
                          orderFeePctStr = !orderFeeUSD.isZero()
                            ? `<0.${'0'.repeat(feeRateDecimals - 1)}1%`
                            : `0.${'0'.repeat(feeRateDecimals)}%`;
                        } else {
                          orderFeePctStr = `${(scaledFeeRate.toNumber() / divisor).toFixed(feeRateDecimals)}%`;
                        }
                      }
                      const feeLabel = isIncreaseType
                        ? t`Open Fee`
                        : t`Close Fee`;
                      feesDetail.push({
                        label: feeLabel,
                        value: orderFeeUSD.neg(),
                        ...(orderFeePctStr
                          ? { orderFeePctStr: t` ${orderFeePctStr} of position size` }
                          : {}),
                      });
                      if (!borrowingFeeUSD.isZero()) {
                        feesDetail.push({
                          label: t`Borrowing Fee`,
                          value: borrowingFeeUSD.neg(),
                        });
                      }
                      if (!negativeFundingFeeUSD.isZero()) {
                        feesDetail.push({
                          label: t`Negative Funding Fee`,
                          value: negativeFundingFeeUSD.neg(),
                        });
                      }
                      if (!positiveFundingFeeUSD.isZero()) {
                        feesDetail.push({
                          label: t`Positive Funding Fee`,
                          value: positiveFundingFeeUSD,
                        });
                      }
                      if (
                        item.kind === 'Liquidation' &&
                        !liquidationFeeUSD.isZero()
                      ) {
                        feesDetail.push({
                          label: t`Liquidation Fee`,
                          value: liquidationFeeUSD.neg(),
                        });
                      }

                      totalFees = orderFeeUSD
                        .neg()
                        .sub(borrowingFeeUSD)
                        .sub(negativeFundingFeeUSD)
                        .add(positiveFundingFeeUSD);
                      if (item.kind === 'Liquidation') {
                        totalFees = totalFees.sub(liquidationFeeUSD);
                      }

                      if (isDecreaseType) {
                        pnlBN = toBN(item.pnl).add(toBN(item.priceImpact)); // pnlPnl + priceImpactValue
                      }
                    }

                    const pnlFormatted = pnlBN !== null
                      ? formatUsdWithMinDisplay(pnlBN)
                      : '-';
                    const feesFormatted = formatUsdWithMinDisplay(totalFees);

                    return (
                      <TableTr key={item.id} bordered={false} hoverable={false}>
                        <TableTd style={{ paddingLeft: '2rem' }}>
                          <div className="Exchange-list-title">
                            <div
                              className="flex items-end gap-5 text-[1.3rem]"
                              style={{ fontWeight: '500' }}
                            >
                              {getActionLabel(item.kind)}
                              <ExternalLink
                                href={getAddressUrl(item.order)}
                                className="mb-[0px] inline-flex hover:opacity-80"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(
                                    getAddressUrl(item.order),
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                              >
                                <img
                                  src={externalIcon}
                                  alt="View in explorer"
                                  width={12}
                                  height={12}
                                />
                              </ExternalLink>
                            </div>
                            <div
                              className="Exchange-list-info-label muted !text-[1.2rem] text-[#A3A3A3]"
                              style={{ fontWeight: '400' }}
                            >
                              {formatTimestamp(item.timestamp, 'calendar')}
                            </div>
                          </div>
                        </TableTd>
                        {/* <TableTd>
                        <span
                          className={classNames('text-body-medium', {
                            'text-green-500': item.isLong,
                            'text-red-500': !item.isLong,
                          })}
                        >
                          {item.isLong ? 'Long' : 'Short'}
                        </span>
                      </TableTd> */}
                        <TableTd>
                          <div className="Exchange-list-title">
                            <div className="inline-flex items-center gap-5">
                              <img
                                className="min-h-20 min-w-20"
                                src={getIconUrlPath(
                                  GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]
                                    ?.symbol === 'WGMX'
                                    ? 'GMX'
                                    : GMX_SOLANA_TOKENS_RAW[
                                        marketInfo?.indexToken
                                      ]?.symbol,
                                  40
                                )}
                                alt={
                                  GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]
                                    ?.symbol
                                }
                                width="20"
                              />
                              <span style={{ fontSize: '1.3rem' }}>
                                {formatMarketName(marketInfo?.indexToken)}
                              </span>
                              <span
                                className={classNames('text-body-medium', {
                                  'text-green-500': item.isLong,
                                  'text-red-500': !item.isLong,
                                })}
                                style={{ fontSize: '1.2rem' }}
                              >
                                {item.isLong ? 'Long' : 'Short'}
                              </span>
                            </div>
                          </div>
                          {/* <div className="subtext">
                          {
                            marketInfo?.longToken ? <>
                              <span>[{marketInfo?.longToken === marketInfo?.shortToken ? GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol : GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol + '-' + GMX_SOLANA_TOKENS_RAW[marketInfo?.shortToken]?.symbol}]</span>
                            </> : <>...</>
                          }
                        </div> */}
                        </TableTd>
                        <TableTd
                          style={{ fontSize: '1.3rem' }}
                          className="text-right"
                        >
                          {formatUsd(item.size, { displayPlus: true })}
                        </TableTd>
                        <TableTd
                          style={{ fontSize: '1.3rem' }}
                          className="text-right"
                        >
                          {formatPriceUsd(
                            item.executionPrice.mul(
                              getUnit(
                                GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]
                                  ?.decimals
                              )
                            ),
                            {
                              isDisplayDecimals:
                                GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
                                  marketInfo?.indexToken
                                ),
                            }
                          )}
                        </TableTd>
                        <TableTd
                          style={{ fontSize: '1.3rem' }}
                          className="text-right"
                        >
                          <span
                            className={classNames({
                              'text-green-500':
                                typeof pnlFormatted === 'string' &&
                                pnlFormatted.startsWith('+') && pnlFormatted.length > 1,
                              'text-red-500':
                                typeof pnlFormatted === 'string' &&
                                pnlFormatted.startsWith('-') && pnlFormatted.length > 1,
                            })}
                          >
                            {pnlFormatted}
                          </span>
                        </TableTd>
                        {/* <TableTd>
                        <div
                          className={classNames({
                            'text-green-500': item.priceImpact.gt(BN_ZERO),
                            'text-red-500': item.priceImpact.lt(BN_ZERO),
                          })}
                        >
                          {item.priceImpact.eq(BN_ZERO)
                            ? '-'
                            : formatUsd(item.priceImpact, {
                                signed: true,
                              })}
                        </div>
                      </TableTd> */}
                        <TableTd style={{ fontSize: '1.3rem' }}>
                          <div
                            className="flex items-center justify-end gap-2"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {feesDetail.length > 0 ? (
                              <TooltipWithPortal
                                className="TradeFeesRow-tooltip"
                                handle={
                                  <span
                                    style={{
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {feesFormatted}
                                  </span>
                                }
                                position="top-end"
                                renderContent={() => (
                                  <div>
                                    {feesDetail.map((fee, idx) => (
                                      <StatsTooltipRow
                                        key={idx}
                                        label={fee.label}
                                        orderFeePctStr={fee.orderFeePctStr}
                                        value={formatUsdWithMinDisplay(fee.value)}
                                        showDollar={false}
                                        labelClassName="text-[#ffffff] font-medium"
                                        textClassName={classNames({
                                          'text-green-500':
                                            fee.value.gt(BN_ZERO),
                                          'text-red-500': fee.value.lt(BN_ZERO),
                                        })}
                                      />
                                    ))}
                                  </div>
                                )}
                              />
                            ) : (
                              <span>
                                {feesFormatted}
                              </span>
                            )}
                          </div>
                        </TableTd>
                        <TableTd style={{ paddingRight: '2rem' }}>
                          {formatMintGT(
                            item?.paidBorrowingFee,
                            mintingCost,
                            gtDecimals
                          )}
                        </TableTd>
                      </TableTr>
                    );
                  })}
              </tbody>
            </Table>
            {sortedHistory.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                {isLoading ? (
                  <LoadingComponent />
                ) : (
                  <div className="text-body-medium text-center font-medium text-[#A3A3A3]">
                    {t`No trade history available`}
                  </div>
                )}
              </div>
            )}
          </div>
        </TableScrollFadeContainer>
      </div>
      {sortedHistory.length > 0 && (
        <div className="Exchange-list-pagination-wrapper">
          <BottomTablePagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
