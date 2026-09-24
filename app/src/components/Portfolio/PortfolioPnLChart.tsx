import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { useMemo, useState } from 'react';
import { useTradeHistoryData } from '@/hooks/statsHooks/useTradeHistoryData';
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ONE_USD } from '@/config/constants';
import Button from '@/components/Common/Button/Button';
import './PortfolioPnLChart.scss';
import { formatNumberUsdToKMB } from '@/utils/legacy/format';

type DateRange = '7d' | '30d' | '90d' | '365d' | 'all';

interface ChartDataPoint {
  timestamp: string;
  dailyPnL: number;
  cumulativePnL: number;
}

export function PortfolioPnLChart() {
  const { historyItems } = useTradeHistoryData();
  const [selectedRange, setSelectedRange] = useState<DateRange>('7d');

  const chartData = useMemo(() => {
    // Calculate the start date based on selected range
    const now = new Date();
    const startDate = new Date(now);
    switch (selectedRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '365d':
        startDate.setDate(now.getDate() - 365);
        break;
      case 'all':
      default:
        startDate.setFullYear(2000); // A date far in the past to show all data
    }

    // Group trades by day and calculate daily PnL
    const dailyPnLMap = new Map<string, BN>();
    historyItems.forEach((item) => {
      const date = new Date(item.timestamp);
      if (date >= startDate) {
        const dateKey = date.toISOString().split('T')[0];
        const currentPnL = dailyPnLMap.get(dateKey) || new BN(0);
        dailyPnLMap.set(dateKey, currentPnL.add(item.pnl));
      }
    });

    // Convert to array and sort by date
    const sortedDates = Array.from(dailyPnLMap.keys()).sort();

    // Calculate cumulative PnL and create chart data points
    let cumulativePnL = 0;
    const data: ChartDataPoint[] = sortedDates.map((date) => {
      const pnlBN = dailyPnLMap.get(date) || new BN(0);
      const dailyPnL = pnlBN.muln(10000).div(ONE_USD).toNumber() / 10000;
      cumulativePnL += dailyPnL;
      return {
        timestamp: date,
        dailyPnL,
        cumulativePnL,
      };
    });

    return data;
  }, [historyItems, selectedRange]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatValue = (value: number) => {
    if (value === 0) return '$0.00';
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <div className="App-card pnl-chart">
      <div className="App-card-title">
        <div className="title-section p-15">
          <Trans>Daily and Cumulative PnL</Trans>
          <div className="time-frame-toggle">
            <Button
              variant={selectedRange === '7d' ? 'primary' : 'secondary'}
              onClick={() => setSelectedRange('7d')}
              className="nowrap"
            >
              <Trans>7d</Trans>
            </Button>
            <Button
              variant={selectedRange === '30d' ? 'primary' : 'secondary'}
              onClick={() => setSelectedRange('30d')}
              className="nowrap"
            >
              <Trans>30d</Trans>
            </Button>
            <Button
              variant={selectedRange === '90d' ? 'primary' : 'secondary'}
              onClick={() => setSelectedRange('90d')}
              className="nowrap"
            >
              <Trans>90d</Trans>
            </Button>
            <Button
              variant={selectedRange === '365d' ? 'primary' : 'secondary'}
              onClick={() => setSelectedRange('365d')}
              className="nowrap"
            >
              <Trans>365d</Trans>
            </Button>
            <Button
              variant={selectedRange === 'all' ? 'primary' : 'secondary'}
              onClick={() => setSelectedRange('all')}
              className="nowrap"
            >
              <Trans>All time</Trans>
            </Button>
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div style={{ height: '220px' }}>
        {chartData.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '16px',
            }}
          >
            <Trans>No trading history available</Trans>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ left: 10, right: 10, bottom: 20, top: 10 }}
            >
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={40}
                tick={{ fontSize: 14 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value: number) => formatNumberUsdToKMB(value)}
                tick={{ fontSize: 14 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value: number) => formatNumberUsdToKMB(value)}
                tick={{ fontSize: 14 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const formattedValue = formatValue(value);
                  const label =
                    name === 'dailyPnL'
                      ? t`Daily PnL`
                      : name === 'cumulativePnL'
                        ? t`Cumulative PnL`
                        : name;
                  return [formattedValue, label];
                }}
                labelFormatter={formatDate}
              />
              <Bar
                yAxisId="left"
                dataKey={(data: ChartDataPoint) =>
                  data.dailyPnL >= 0 ? data.dailyPnL : undefined
                }
                fill="#31C366"
                name="dailyPnL"
              />
              <Bar
                yAxisId="left"
                dataKey={(data: ChartDataPoint) =>
                  data.dailyPnL < 0 ? data.dailyPnL : undefined
                }
                fill="#FF5454"
                name="dailyPnL"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePnL"
                stroke="#3b82f6"
                name="cumulativePnL"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
