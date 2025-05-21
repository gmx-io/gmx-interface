import { ReactNode, useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { getMarketIndexName } from "domain/synthetics/markets";
import { bigintToNumber } from "lib/numbers";
import { USD_DECIMALS } from "sdk/configs/factors";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";

import { CompositionItem, getCompositionPercentage } from "../hooks/useCompositionData";
interface CompositionBarProps {
  data: CompositionItem[];
  label: ReactNode;
}

export function CompositionBar({ data, label }: CompositionBarProps) {
  const chartData = useMemo((): CompositionChartItem[] => {
    const sum = data.reduce((acc, item) => {
      return (
        acc +
        (item.type === "market"
          ? bigintToNumber(item.gmBalanceUsd, USD_DECIMALS)
          : bigintToNumber(item.amount, USD_DECIMALS))
      );
    }, 0);

    return data.map((item) => {
      const value =
        item.type === "market"
          ? bigintToNumber(item.gmBalanceUsd, USD_DECIMALS)
          : bigintToNumber(item.amount, USD_DECIMALS);
      const color =
        (item.type === "market"
          ? TOKEN_COLOR_MAP[item.market.indexToken.symbol]
          : TOKEN_COLOR_MAP[item.token.symbol]) ?? TOKEN_COLOR_MAP.default;
      return {
        key: item.type === "market" ? item.market.marketTokenAddress : `${item.token.address}-${item.side}`,
        color,
        value,
        tooltipContent: (
          <TooltipContent
            color={color}
            value={value}
            sum={sum}
            name={item.type === "market" ? getMarketIndexName(item.market) : item.token.symbol}
            symbol={item.type === "market" ? item.market.indexToken.symbol : item.token.symbol}
          />
        ),
      };
    });
  }, [data]);

  return (
    <div>
      <CompositionChart items={chartData} label={label} />
    </div>
  );
}

const TooltipContent = ({
  color,
  value,
  sum,
  name,
  symbol,
}: {
  color: string;
  value: number;
  sum: number;
  name: string;
  symbol: string;
}) => {
  const dotStyle = useMemo(() => ({ backgroundColor: color }), [color]);

  return (
    <div className="flex w-max items-center gap-4">
      <div className="mr-2 h-8 w-8 shrink-0 grow rounded-full" style={dotStyle} />
      <TokenIcon symbol={symbol} displaySize={16} />
      <p className="text-body-medium">{name}:</p>
      <p className="text-body-medium">{getCompositionPercentage(value, sum)}%</p>
    </div>
  );
};

interface CompositionChartProps {
  items: CompositionChartItem[];
  label: ReactNode;
}

type CompositionChartItem = {
  key: string;
  tooltipContent: ReactNode;
  value: number;
  color: string;
};

const CompositionTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as CompositionChartItem;

    return <div className="rounded-4 bg-slate-600 p-10">{item.tooltipContent}</div>;
  }

  return null;
};

const CELL_STYLE = { cursor: "pointer" };

export function CompositionChart({ items, label }: CompositionChartProps) {
  return (
    <div className="relative h-[160px] w-[160px]">
      <div className="text-body-large absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] text-center">
        {label}
      </div>
      <PieChart width={160} height={160}>
        <Pie
          data={items}
          dataKey="value"
          outerRadius={80}
          innerRadius={70}
          stroke="var(--color-slate-800)"
          fill="#8884d8"
          startAngle={270}
          endAngle={-90}
          strokeWidth={items.length <= 1 ? 0 : 1.5}
        >
          {items.map((entry) => (
            <Cell key={entry.key} fill={entry.color} style={CELL_STYLE} />
          ))}
        </Pie>

        <Tooltip content={CompositionTooltip} />
      </PieChart>
    </div>
  );
}
