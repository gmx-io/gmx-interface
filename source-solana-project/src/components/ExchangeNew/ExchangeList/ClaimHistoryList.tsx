import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { NEW_EXCHANGE_LIST_PER_PAGE } from '@/config/ui';
import { useClaimHistoryData } from '@/hooks/statsHooks/useClaimHistoryData';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { getUnit } from '@/utils/legacy/common';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import {
  formatAmount,
  formatDeltaUsd,
  formatPriceUsd,
  formatTimestamp,
  formatUsd,
} from '@/utils/legacy/format';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import { getIconUrlPath } from '@/utils/lib/icon';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { useMedia } from 'react-use';
import { useShallow } from 'zustand/react/shallow';
import { ClaimOther } from '@/components/ExchangeNew/ExchangeList/components/ClaimOther/ClaimOther';
import { BN } from '@coral-xyz/anchor';
import { getSimulateOrderByMarketDecrease } from '@/components/TradeBoxNew/utils/getSimulateResult';
import { useStoreProgram } from '@/contexts/anchor';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { useDateRangeFilter } from '@/hooks/utilsHooks/useDateRangeFilter';
import LoadingComponent from '@/utils/LoadingComponent';
import { getTableEmptyStateClass } from '@/config/tableHeights';
import { getGmw424Enabled } from '@/config/featureFlagEnable';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface ClaimHistoryListProps {
  dateRange?: Value;
}

export function ClaimHistoryList({ dateRange }: ClaimHistoryListProps) {
  const storeProgram = useStoreProgram();

  const { claimItems, isLoading } = useClaimHistoryData();
  const marketsInfo = useAppStore(selectMarketsInfo);
  const isScreenSmall = useMedia('(max-width: 1100px)');
  const isMobileView = useMedia('(max-width: 768px)');
  const [page, setPage] = useState(1);

  const { markets, graphObj, marketBase64Map, positions, positionMap } =
    useAppStore(
      useShallow((state) => ({
        markets: state.markets.markets,
        graphObj: state.TradeboxNew.graphObj,
        marketBase64Map: state.markets.marketBase64Map,
        positions: state.positionState.positions,
        positionMap: state.positionState.positionMap,
      }))
    );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tickers: state.tickersState.tickers,
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );

  const [priceImpactValue, setPriceImpactValue] = useState(new BN('0'));
  const [autoClaimedFundingFees, setAutoClaimedFundingFees] = useState(0);
  const [autoClaimedPriceImpact, setAutoClaimedPriceImpact] = useState(0);
  const [penddingFundingFees, setPenddingFundingFees] = useState(0);
  const [pendingPriceImpact, setPendingPriceImpact] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [isMobileView]);

  useEffect(() => {
    let autoClaimedFundingFees = 0;
    let autoClaimedPriceImpactValue = 0;
    claimItems.forEach((item) => {
      const marketToken = markets.filter((token) => {
        return token.marketToken.toString() === item.marketToken.toString();
      });
      let marketInfo = {};
      if (!marketToken || !marketToken.length) return null;
      marketInfo = marketToken[0];

      const token = item.isLong
        ? GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]
        : GMX_SOLANA_TOKENS_RAW[marketInfo?.shortToken];

      const amount = item.isLong
        ? item.feesClaimableFundingFeeLongTokenAmount
        : item.feesClaimableFundingFeeShortTokenAmount;

      const priceRaw = item.isLong ? item.pricesLongMax : item.pricesShortMax;
      const price = priceRaw.mul(getUnit(token.decimals));

      const itemPrice = formatUsd(
        convertTokenAmountToUsd(amount, token.decimals, price),
        { signed: false, showDollarSign: false, showUseCommas: false }
      );

      const itemPriceImpact = formatUsd(item.priceImpactValue, {
        signed: false,
        showDollarSign: false,
        showUseCommas: false
      });

      autoClaimedFundingFees += Number(itemPrice);
      autoClaimedPriceImpactValue += Number(itemPriceImpact);
    });

    setAutoClaimedFundingFees(autoClaimedFundingFees);
    setAutoClaimedPriceImpact(autoClaimedPriceImpactValue);
  }, [claimItems]);

  useEffect(() => {
    const isGmw424Enabled = getGmw424Enabled();
    const positionsData = isGmw424Enabled
      ? Object.values(positions)
      : (positions as unknown as (typeof positions)[string][]);

    if (!positionsData.length) {
      if (isGmw424Enabled) {
        setPenddingFundingFees(0);
        setPendingPriceImpact(0);
      }
      return;
    }

    const pendingSum = positionsData.reduce((acc, p) => {
      const long = new BN(
        p.pending_claimable_funding_fee_value_in_long_token || 0
      );
      const short = new BN(
        p.pending_claimable_funding_fee_value_in_short_token || 0
      );
      return acc.add(long.add(short));
    }, new BN(0));

    setPenddingFundingFees(
      Number(
        formatUsd(pendingSum, { signed: false, showDollarSign: false, showUseCommas: false }) || '0'
      )
    );

    Promise.all(
      positionsData.map((p) =>
        getSimulateOrderByMarketDecrease(new BN(0), new BN(0), {
          graphObj,
          collateralToken: p.collateralTokenAddress.toBase58(),
          receiveToken: p.collateralTokenAddress.toBase58(),
          positionBase64: positionMap.get(p.address.toBase58()),
          marketToken: p.marketTokenAddress.toBase58(),
          isLong: p.isLong,
          sizeNum: p.sizeInUsd,
          amount: new BN('0'),
          marketInfo: p.marketInfo,
          marketBase64Map,
          tokenPriceMap,
          storeProgram,
        })
          .then((res) => new BN(res.reportData?.price_impact_value || 0))
          .catch(() => new BN(0))
      )
    ).then((impacts) => {
      const totalImpact = impacts.reduce((s, v) => s.add(v), new BN(0));
      setPendingPriceImpact(
        Number(
          formatUsd(totalImpact, { signed: false, showDollarSign: false, showUseCommas: false }) ||
          '0'
        )
      );
    });
  }, [positions]);

  const expandedClaimItems = useMemo(() => {
    return claimItems.flatMap((item) => {
      const hasLongClaim =
        !item.feesClaimableFundingFeeLongTokenAmount.isZero();

      const hasShortClaim =
        !item.feesClaimableFundingFeeShortTokenAmount.isZero();
      const results = [];

      if (hasLongClaim) {
        results.push({ ...item, isLong: true });
      }
      if (hasShortClaim) {
        results.push({ ...item, isLong: false });
      }
      return results;
    });
  }, [claimItems]);

  // Apply date range filter
  const dateFilteredClaims = useDateRangeFilter(expandedClaimItems, dateRange);

  const sortedClaims = useMemo(() => {
    return [...dateFilteredClaims].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [dateFilteredClaims]);

  const itemsPerPage = isMobileView ? 25 : NEW_EXCHANGE_LIST_PER_PAGE;

  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedClaims.slice(startIndex, endIndex);
  }, [sortedClaims, page, itemsPerPage]);

  const pageCount = Math.ceil(sortedClaims.length / itemsPerPage);

  // if (isScreenSmall) {
  //   return (
  //     <div>
  //       {sortedClaims.length === 0 && (
  //         <div className="App-card text-center text-gray-400">
  //           {isLoading ? t`Loading...` : t`No claim history available`}
  //         </div>
  //       )}
  //       <div className="grid grid-cols-1 gap-10 min-[800px]:grid-cols-2">
  //         {!isLoading &&
  //           currentPageItems.map((item) => {
  //             // const marketInfo = marketsInfo[item.marketToken.toString()];
  //             // if (!marketInfo) return null;
  //             const marketToken = markets.filter((token) => {
  //               return (
  //                 token.marketToken.toString() === item.marketToken.toString()
  //               );
  //             });
  //             let marketInfo = {};
  //             if (!marketToken || !marketToken.length) return null;
  //             marketInfo = marketToken[0];

  //             const token = item.isLong
  //               ? GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]
  //               : GMX_SOLANA_TOKENS_RAW[marketInfo?.shortToken];

  //             const amount = item.isLong
  //               ? item.feesClaimableFundingFeeLongTokenAmount
  //               : item.feesClaimableFundingFeeShortTokenAmount;

  //             const priceRaw = item.isLong
  //               ? item.pricesLongMax
  //               : item.pricesShortMax;

  //             const price = priceRaw.mul(getUnit(token.decimals));

  //             return (
  //               <div key={`${item.id}-${item.isLong}`} className="App-card">
  //                 <div className="App-card-title">
  //                   <div className="flex items-center gap-4">
  //                     <img
  //                       className="min-h-20 min-w-20"
  //                       src={getIconUrlPath(
  //                         GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol,
  //                         40
  //                       )}
  //                       alt={
  //                         GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol
  //                       }
  //                       width="20"
  //                     />
  //                     <span className="text-body-medium">
  //                       {GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol}
  //                       /USD
  //                     </span>
  //                   </div>
  //                   <div
  //                     className={classNames('text-body-medium', {
  //                       'text-green-500': item.isLong,
  //                       'text-red-500': !item.isLong,
  //                     })}
  //                   >
  //                     {item.isLong ? 'Long' : 'Short'}
  //                   </div>
  //                 </div>

  //                 <div className="App-card-divider" />

  //                 <div className="grid gap-10">
  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Action</Trans>
  //                     </div>
  //                     <div>
  //                       <Trans>Auto Claim</Trans>
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Market</Trans>
  //                     </div>
  //                     TODO
  //                     {/* <div>
  //                       <div className="flex items-center gap-5">
  //                         <span>{getMarketIndexName(marketInfo)}</span>
  //                         <span className="subtext">
  //                           [{getMarketPoolName(marketInfo)}]
  //                         </span>
  //                       </div>
  //                     </div> */}
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Claimed Token</Trans>
  //                     </div>
  //                     <div className="flex items-center gap-5">
  //                       <img
  //                         className="size-20"
  //                         src={getIconUrlPath(token.symbol, 24)}
  //                         alt={token.symbol}
  //                       />
  //                       <span>
  //                         {formatAmount(amount, token.decimals, token.decimals)}{' '}
  //                         {token.symbol}
  //                       </span>
  //                     </div>
  //                   </div>

  //                   <div className="flex justify-between">
  //                     <div className="text-sm text-gray-400">
  //                       <Trans>Claimed Value</Trans>
  //                     </div>
  //                     <div className="text-green-500">
  //                       {formatUsd(
  //                         convertTokenAmountToUsd(
  //                           amount,
  //                           token.decimals,
  //                           price
  //                         ),
  //                         { signed: true }
  //                       )}
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
    <div>
      <ClaimOther
        autoClaimedFundingFees={autoClaimedFundingFees}
        autoClaimedPriceImpact={autoClaimedPriceImpact}
        penddingFundingFees={penddingFundingFees}
        pendingPriceImpact={pendingPriceImpact}
      />
      <div className="Exchange-list-container">
        <div className="Exchange-list-table-wrapper">
          <TableScrollFadeContainer>
            <div className={getTableEmptyStateClass('tradeClaims')}>
              <Table>
                <thead className="text-body-medium">
                  <TableTheadTr style={{ textTransform: 'uppercase' }}>
                    <TableTh
                      style={{
                        fontSize: '1.1rem',
                        paddingLeft: '2rem',
                        color: '#A3A3A3',
                      }}
                    >
                      <Trans>Action</Trans>
                    </TableTh>
                    <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                      <Trans>Market</Trans>
                    </TableTh>
                    <TableTh
                      style={{
                        fontSize: '1.1rem',
                        color: '#A3A3A3',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Trans>Claimed Token</Trans>
                    </TableTh>
                    <TableTh
                      style={{
                        fontSize: '1.1rem',
                        color: '#A3A3A3',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Trans>Claimed Value</Trans>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {!isLoading &&
                    currentPageItems.map((item) => {
                      // const marketInfo = marketsInfo[item.marketToken.toString()];
                      // if (!marketInfo) return null;
                      const marketToken = markets.filter((token) => {
                        return (
                          token.marketToken.toString() ===
                          item.marketToken.toString()
                        );
                      });
                      let marketInfo = {};
                      if (!marketToken || !marketToken.length) return null;
                      marketInfo = marketToken[0];

                      const token = item.isLong
                        ? GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]
                        : GMX_SOLANA_TOKENS_RAW[marketInfo?.shortToken];

                      const amount = item.isLong
                        ? item.feesClaimableFundingFeeLongTokenAmount
                        : item.feesClaimableFundingFeeShortTokenAmount;

                      const priceRaw = item.isLong
                        ? item.pricesLongMax
                        : item.pricesShortMax;
                      const price = priceRaw.mul(getUnit(token.decimals));

                      return (
                        <TableTr
                          key={`${item.id}-${item.isLong}`}
                          bordered={false}
                          hoverable={false}
                        >
                          <TableTd style={{ paddingLeft: '2rem' }}>
                            <div className="Exchange-list-title text-[1.3rem]">
                              <Trans>Auto Claim</Trans>
                            </div>
                            <div
                              className="Exchange-list-info-label muted !text-[1.2rem] text-[#A3A3A3]"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {formatTimestamp(item.timestamp, 'calendar')}
                            </div>
                          </TableTd>
                          <TableTd>
                            <div
                              className="Exchange-list-title"
                              style={{ display: 'flex' }}
                            >
                              <div className="inline-flex items-center gap-5">
                                <img
                                  className="min-h-20 min-w-20"
                                  src={getIconUrlPath(
                                    GMX_SOLANA_TOKENS_RAW[
                                      marketInfo?.indexToken
                                    ]?.symbol === 'WGMX'
                                      ? 'GMX'
                                      : GMX_SOLANA_TOKENS_RAW[
                                        marketInfo?.indexToken
                                      ]?.symbol,
                                    40
                                  )}
                                  alt={
                                    GMX_SOLANA_TOKENS_RAW[
                                      marketInfo?.indexToken
                                    ]?.symbol
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
                          </TableTd>
                          <TableTd>
                            <div
                              className="Exchange-list-title"
                              style={{ display: 'flex' }}
                            >
                              <div className="inline-flex items-center gap-5">
                                <img
                                  className="min-h-20 min-w-20"
                                  src={getIconUrlPath(
                                    token.symbol === 'WGMX'
                                      ? 'GMX'
                                      : token.symbol,
                                    24
                                  )}
                                  alt={token.symbol}
                                  width="20"
                                />
                                <span style={{ fontSize: '1.3rem' }}>
                                  {formatAmount(
                                    amount,
                                    token.decimals,
                                    token.decimals
                                  )}{' '}
                                  {getNormalizedTokenSymbolGMX(token.symbol)}
                                </span>
                              </div>
                            </div>
                          </TableTd>
                          <TableTd>
                            <div
                              className="text-green-500"
                              style={{ fontSize: '1.2rem' }}
                            >
                              {(() => {
                                const usdValue = convertTokenAmountToUsd(
                                  amount,
                                  token.decimals,
                                  price
                                );
                                const threshold = new BN(10).pow(new BN(18));
                                if (usdValue.lt(threshold)) {
                                  return '< +$0.01';
                                }
                                return formatUsd(usdValue, { signed: true });
                              })()}
                            </div>
                          </TableTd>
                        </TableTr>
                      );
                    })}
                </tbody>
              </Table>
              {sortedClaims.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  {isLoading ? (
                    <LoadingComponent />
                  ) : (
                    <div className="text-body-medium text-center text-[#A3A3A3] font-medium">
                      {t`No claim history available`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TableScrollFadeContainer>
        </div>
        {sortedClaims.length > 0 && (
          <div className="Exchange-list-pagination-wrapper">
            <BottomTablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
