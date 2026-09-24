import './PortfolioPerformanceCard.scss';

import Button from '@/components/Common/Button/Button';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import { TruncatedCell } from '@/components/Common/Table/TruncatedCell';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { ONE_USD, USD_DECIMALS } from '@/config/constants';
import { useTradeHistoryData } from '@/hooks/statsHooks/useTradeHistoryData';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { formatPercentage, formatUsdToKMB } from '@/utils/legacy/format';
import { parseValue } from '@/utils/legacy/parse';
import { getByKey } from '@/utils/lib/object';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import classNames from 'classnames';
import { useMemo, useState } from 'react';
import InfoSvg from '@/img/pools/Info.svg';

interface PerformanceData {
  volume: BN;
  pnl: BN;
  pnlPercentage: number;
  wins: number;
  losses: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  hasOnlyWins: boolean;
}

const EMPTY_PERFORMANCE: PerformanceData = {
  volume: new BN(0),
  pnl: new BN(0),
  pnlPercentage: 0,
  wins: 0,
  losses: 0,
  maxDrawdown: 0,
  winRate: 0,
  profitFactor: 0,
  averageWin: 0,
  averageLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  hasOnlyWins: false,
};

type TimeFrame =
  | 'today'
  | 'yesterday'
  | 'last7d'
  | 'last30d'
  | 'thisYear'
  | 'allTime';

export function PortfolioPerformanceCard() {
  const { historyItems } = useTradeHistoryData();
  const marketsInfo = useAppStore(selectMarketsInfo);
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>('today');

  const performanceData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    const calculateMetrics = (items: typeof historyItems) => {
      const data: PerformanceData = { ...EMPTY_PERFORMANCE };
      let totalWinAmount = 0;
      let totalLossAmount = 0;
      let currentDrawdown = 0;
      let maxDrawdown = 0;
      let equity = 0;
      let peakEquity = 0;
      let currentConsecutiveWins = 0;
      let currentConsecutiveLosses = 0;
      let winCount = 0;
      let lossCount = 0;

      items.forEach((item) => {
        // Calculate volume
        const size = BN.max(item.size, new BN(0));
        data.volume = data.volume.add(size);

        // Calculate PnL
        const pnlValue = item.pnl.muln(10000).div(ONE_USD).toNumber() / 10000;
        data.pnl = data.pnl.add(item.pnl);

        // Update equity and drawdown
        equity += pnlValue;
        if (equity > peakEquity) {
          peakEquity = equity;
          currentDrawdown = 0;
        } else {
          currentDrawdown = ((peakEquity - equity) / peakEquity) * 100;
          if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
          }
        }

        // Count wins/losses and track consecutive trades
        if (pnlValue > 0) {
          winCount++;
          totalWinAmount += pnlValue;
          data.largestWin = Math.max(data.largestWin, pnlValue);
          currentConsecutiveWins++;
          currentConsecutiveLosses = 0;
        } else if (pnlValue < 0) {
          lossCount++;
          totalLossAmount += Math.abs(pnlValue);
          data.largestLoss = Math.max(data.largestLoss, Math.abs(pnlValue));
          currentConsecutiveLosses++;
          currentConsecutiveWins = 0;
        }

        data.consecutiveWins = Math.max(
          data.consecutiveWins,
          currentConsecutiveWins
        );
        data.consecutiveLosses = Math.max(
          data.consecutiveLosses,
          currentConsecutiveLosses
        );
      });

      // TODO: This is a temporary fix to ensure the PnL percentage is not NaN
      // Calculate PnL percentage
      if (items.length > 0) {
        let totalCollateralValue = new BN(0);
        items.forEach((item) => {
          // Get the market info for this trade
          const marketInfo = getByKey(marketsInfo, item.marketToken.toBase58());
          if (!marketInfo) return;

          // Get the token based on isCollateralLong flag
          const collateralToken = item.isCollateralLong
            ? marketInfo.longToken
            : marketInfo.shortToken;

          // Convert delta collateral amount to USD using the collateral token's price
          const collateralValue =
            convertTokenAmountToUsd(
              item.afterCollateralAmount.sub(item.beforeCollateralAmount).abs(),
              collateralToken.decimals,
              collateralToken.prices.maxPrice
            ) || new BN(0);

          totalCollateralValue = totalCollateralValue.add(collateralValue);
        });

        if (!totalCollateralValue.isZero()) {
          data.pnlPercentage = data.pnl
            .mul(new BN(10000))
            .div(totalCollateralValue)
            .toNumber();
        }
      }

      // Calculate win rate
      const totalTrades = winCount + lossCount;
      data.winRate = totalTrades > 0 ? (winCount / totalTrades) * 10000 : 0;

      // Calculate average win/loss
      data.averageWin = winCount > 0 ? totalWinAmount / winCount : 0;
      data.averageLoss = lossCount > 0 ? totalLossAmount / lossCount : 0;

      // Calculate Factor
      data.hasOnlyWins = totalLossAmount === 0 && totalWinAmount > 0;
      data.profitFactor =
        totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount;

      // Set max drawdown
      data.maxDrawdown = maxDrawdown;

      return data;
    };

    const todayItems = historyItems.filter(
      (item) => new Date(item.timestamp) >= today
    );
    const yesterdayItems = historyItems.filter(
      (item) =>
        new Date(item.timestamp) >= yesterday &&
        new Date(item.timestamp) < today
    );
    const last7DaysItems = historyItems.filter(
      (item) => new Date(item.timestamp) >= last7Days
    );
    const last30DaysItems = historyItems.filter(
      (item) => new Date(item.timestamp) >= last30Days
    );
    const thisYearItems = historyItems.filter(
      (item) => new Date(item.timestamp) >= thisYear
    );

    return {
      today: calculateMetrics(todayItems),
      yesterday: calculateMetrics(yesterdayItems),
      last7d: calculateMetrics(last7DaysItems),
      last30d: calculateMetrics(last30DaysItems),
      thisYear: calculateMetrics(thisYearItems),
      allTime: calculateMetrics(historyItems),
    };
  }, [historyItems, marketsInfo]);

  const timeframes = [
    { key: 'today' as TimeFrame, label: t`Today`, data: performanceData.today },
    {
      key: 'yesterday' as TimeFrame,
      label: t`Yesterday`,
      data: performanceData.yesterday,
    },
    {
      key: 'last7d' as TimeFrame,
      label: t`Last 7d`,
      data: performanceData.last7d,
    },
    {
      key: 'last30d' as TimeFrame,
      label: t`Last 30d`,
      data: performanceData.last30d,
    },
    {
      key: 'thisYear' as TimeFrame,
      label: t`This Year`,
      data: performanceData.thisYear,
    },
    {
      key: 'allTime' as TimeFrame,
      label: t`All Time`,
      data: performanceData.allTime,
    },
  ];

  const currentData = performanceData[selectedTimeFrame];

  return (
    <div className="App-card performance-card">
      {/* Desktop view - Title and content */}
      <div className="desktop-view-container">
        <div className="App-card-title">
          <div className="title-section border-b-1/2 border-slate-600 p-15 text-20 font-medium">
            <Trans>General Performance Details</Trans>
          </div>
        </div>
        <div className="App-card-divider" />
        <div className="App-card-content">
          {/* Desktop view - Table layout */}
          <div className="desktop-view">
            <Table>
              <thead>
                <TableTheadTr>
                  <TableTh className="date-column">
                    <Trans>DATE</Trans>
                  </TableTh>
                  <TableTh>
                    <Trans>VOLUME</Trans>
                  </TableTh>
                  <TableTh>
                    <TooltipWithPortal
                      handle={
                        <>
                          <Trans>PNL($)</Trans>
                          <img src={InfoSvg} alt="" />
                        </>
                      }
                      className="normal-case"
                      position="bottom-end"
                      renderContent={() => (
                        <p className="text-white">
                          <Trans>
                            The total realized and unrealized profit and loss for the period,
                            including fees and price impact.
                          </Trans>
                        </p>
                      )}
                    />

                  </TableTh>
                  <TableTh className="pnl-percent-column">
                    <TooltipWithPortal
                      handle={
                        <>
                          <Trans>PNL (%)</Trans>
                          <img src={InfoSvg} alt="" />
                        </>
                      }
                      className="normal-case"
                      position="bottom-end"
                      renderContent={() => (
                        <>
                          <p className="text-white">
                            <Trans>
                              The PnL ($) compared to the capital used.
                            </Trans>
                          </p>
                          <p className="text-white" style={{ marginTop: '1rem' }}>
                            <Trans>
                              The capital used is calculated as the highest value of [sum of collateral of open positions -
                              realized PnL + period start pending PnL].
                            </Trans>
                          </p>
                        </>
                      )}
                    />
                  </TableTh>
                  <TableTh className="win-rate-column">
                    <Trans>WIN / LOSS</Trans>
                  </TableTh>
                  {/* <TableTh className="profit-factor-column">
                    <Trans>Factor</Trans>
                  </TableTh> */}
                </TableTheadTr>
              </thead>
              <tbody>
                {timeframes.map(({ key, label, data }) => (
                  <TableTr key={key} hoverable={false} bordered={false}>
                    <TableTd className="date-column">{label}</TableTd>
                    <TableTd>
                      <TruncatedCell>
                        {formatUsdToKMB(data.volume)}
                      </TruncatedCell>
                    </TableTd>
                    <TableTd
                      className={classNames({
                        'text-green-500': data.pnl.gt(new BN(0)),
                        'text-red-500': data.pnl.lt(new BN(0)),
                      })}
                    >
                      <TruncatedCell>
                        {formatUsdToKMB(data.pnl, { signed: true })}
                      </TruncatedCell>
                    </TableTd>
                    <TableTd
                      className={classNames('pnl-percent-column', {
                        'text-green-500': data.pnlPercentage > 0,
                        'text-red-500': data.pnlPercentage < 0,
                      })}
                    >
                      {formatPercentage(data.pnlPercentage, 2, {
                        fallbackToZero: true,
                        signed: true,
                      })}
                    </TableTd>
                    <TableTd className="win-rate-column">
                      {formatPercentage(data.winRate, 2, {
                        fallbackToZero: true,
                      })}
                    </TableTd>
                    {/* <TableTd className="profit-factor-column">
                      {data.hasOnlyWins ? '∞' : data.profitFactor.toFixed(2)}
                    </TableTd> */}
                  </TableTr>
                ))}
              </tbody>
            </Table>

            {/* <div className="App-card-divider my-2" /> */}

            {/* <div className="mt-2">
              <Table className="gap-0">
                <tbody>
                  <TableTr hoverable={false} bordered={false}>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Average Win</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div className="text-green-500">
                        {formatUsdToKMB(
                          parseValue(
                            performanceData.allTime.averageWin.toString(),
                            USD_DECIMALS
                          ) || new BN(0),
                          { signed: true }
                        )}
                      </div>
                    </TableTd>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Average Loss</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div className="text-red-500">
                        {formatUsdToKMB(
                          (
                            parseValue(
                              performanceData.allTime.averageLoss.toString(),
                              USD_DECIMALS
                            ) || new BN(0)
                          ).neg(),
                          { signed: true }
                        )}
                      </div>
                    </TableTd>
                  </TableTr>
                  <TableTr hoverable={false} bordered={false}>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Largest Win</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div className="text-green-500">
                        {formatUsdToKMB(
                          parseValue(
                            performanceData.allTime.largestWin.toString(),
                            USD_DECIMALS
                          ) || new BN(0),
                          { signed: true }
                        )}
                      </div>
                    </TableTd>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Largest Loss</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div className="text-red-500">
                        {formatUsdToKMB(
                          (
                            parseValue(
                              performanceData.allTime.largestLoss.toString(),
                              USD_DECIMALS
                            ) || new BN(0)
                          ).neg(),
                          { signed: true }
                        )}
                      </div>
                    </TableTd>
                  </TableTr>
                  <TableTr hoverable={false} bordered={false}>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Consecutive Wins</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div>{performanceData.allTime.consecutiveWins}</div>
                    </TableTd>
                    <TableTd className="w-1/3">
                      <div>
                        <Trans>Consecutive Losses</Trans>
                      </div>
                    </TableTd>
                    <TableTd className="w-1/6">
                      <div>{performanceData.allTime.consecutiveLosses}</div>
                    </TableTd>
                  </TableTr>
                </tbody>
              </Table>
            </div> */}
          </div>
        </div>
      </div>

      {/* Mobile view - Flex layout */}
      <div className="mobile-view">
        {/* Performance Details Section */}
        <div className="mobile-section">
          <div className="mobile-section-title">
            <Trans>Performance Details</Trans>
            <div className="time-frame-toggle mobile-only">
              {timeframes.map((timeframe) => (
                <Button
                  key={timeframe.key}
                  variant={
                    selectedTimeFrame === timeframe.key
                      ? 'primary'
                      : 'secondary'
                  }
                  onClick={() => setSelectedTimeFrame(timeframe.key)}
                  className="nowrap"
                >
                  <Trans>{timeframe.label}</Trans>
                </Button>
              ))}
            </div>
          </div>
          <div className="mobile-stats">
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Date</Trans>
              </div>
              <div className="value">
                {timeframes.find((t) => t.key === selectedTimeFrame)?.label}
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Volume</Trans>
              </div>
              <div className="value">
                <TruncatedCell>
                  {formatUsdToKMB(currentData.volume)}
                </TruncatedCell>
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>PnL</Trans>
              </div>
              <div
                className={classNames('value', {
                  'text-green-500': currentData.pnl.gt(new BN(0)),
                  'text-red-500': currentData.pnl.lt(new BN(0)),
                })}
              >
                <TruncatedCell>
                  {formatUsdToKMB(currentData.pnl, { signed: true })}
                </TruncatedCell>
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>PnL (%)</Trans>
              </div>
              <div
                className={classNames('value', {
                  'text-green-500': currentData.pnlPercentage > 0,
                  'text-red-500': currentData.pnlPercentage < 0,
                })}
              >
                {formatPercentage(currentData.pnlPercentage, 2, {
                  fallbackToZero: true,
                  signed: true,
                })}
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Win Rate</Trans>
              </div>
              <div className="value">
                {formatPercentage(currentData.winRate, 2, {
                  fallbackToZero: true,
                })}
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Factor</Trans>
              </div>
              <div className="value">
                {currentData.hasOnlyWins
                  ? '∞'
                  : currentData.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="App-card-divider my-10" />

        {/* All Time Statistics Section */}
        <div className="mobile-section">
          <div className="mobile-section-title">
            <Trans>All Time Statistics</Trans>
          </div>
          <div className="mobile-stats-summary">
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Average Win/Loss</Trans>
              </div>
              <div className="value">
                <span className="text-green-500">
                  {formatUsdToKMB(
                    parseValue(
                      performanceData.allTime.averageWin.toString(),
                      USD_DECIMALS
                    ) || new BN(0),
                    { signed: true }
                  )}
                </span>
                {' / '}
                <span className="text-red-500">
                  {formatUsdToKMB(
                    (
                      parseValue(
                        performanceData.allTime.averageLoss.toString(),
                        USD_DECIMALS
                      ) || new BN(0)
                    ).neg(),
                    { signed: true }
                  )}
                </span>
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Largest Win/Loss</Trans>
              </div>
              <div className="value">
                <span className="text-green-500">
                  {formatUsdToKMB(
                    parseValue(
                      performanceData.allTime.largestWin.toString(),
                      USD_DECIMALS
                    ) || new BN(0),
                    { signed: true }
                  )}
                </span>
                {' / '}
                <span className="text-red-500">
                  {formatUsdToKMB(
                    (
                      parseValue(
                        performanceData.allTime.largestLoss.toString(),
                        USD_DECIMALS
                      ) || new BN(0)
                    ).neg(),
                    { signed: true }
                  )}
                </span>
              </div>
            </div>
            <div className="flex-row-item no-border">
              <div className="label">
                <Trans>Consecutive Wins/Losses</Trans>
              </div>
              <div className="value">
                {performanceData.allTime.consecutiveWins} /{' '}
                {performanceData.allTime.consecutiveLosses}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
