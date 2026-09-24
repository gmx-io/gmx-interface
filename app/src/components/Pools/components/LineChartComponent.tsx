import React, { useMemo, useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

type LineChartPoint = { timeStamp?: number | string; ydata?: number | string } | number;
type LineChartProps = {
  color?: string;
  className?: string;
  width?: number;
  height?: number;
  data?: LineChartPoint[];
  hideWhenNoData?: boolean;
  /** When true, Y-axis starts from data minimum instead of 0 */
  autoScale?: boolean;
};


const LineChartComponent: React.FC<LineChartProps> = ({
  color = '#31C366',
  className,
  width = 140,
  height = 32,
  data,
  hideWhenNoData = false,
  autoScale = false,
}) => {

  const hasValidData = useMemo(() => {
    if (!data) return false;
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return false;
    return true;
  }, [data]);


  const chartData = useMemo(() => {
    if (!hasValidData) {
      return [];
    }

    const items = data
      .map((d, idx) => {
        if (typeof d === 'number') return { index: idx, value: d };
        const yRaw = (d as any)?.ydata;
        const y = typeof yRaw === 'string' ? parseFloat(yRaw) : Number(yRaw ?? 0);
        if (!isNaN(y)) return { index: idx, value: y };
        return null;
      })
      .filter((v) => v !== null) as { index: number; value: number }[];

    return items;
  }, [data, hasValidData]);


  const uniqueId = useId();
  const gradientId = useMemo(() => {
    const colorHash = String(color).replace(/[^a-zA-Z0-9]/g, '');
    return `mini-chart-gradient-${colorHash}-${uniqueId.replace(/:/g, '-')}`;
  }, [color, uniqueId]);


  const chartDataRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };
    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return { min: minValue, max: maxValue };
  }, [chartData]);


  if (hideWhenNoData && (!hasValidData || chartData.length === 0)) {
    return null;
  }

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 1, left: 1, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis
            hide
            domain={autoScale
              ? [chartDataRange.min, 'auto']
              : [chartDataRange.min < 0 ? chartDataRange.min : 0, 'auto']
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            baseValue="dataMin"
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-in-out"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
