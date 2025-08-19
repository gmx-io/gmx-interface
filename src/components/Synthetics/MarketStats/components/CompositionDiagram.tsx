import { ReactNode, useMemo } from "react";

import { getMarketIndexName } from "domain/synthetics/markets";
import { bigintToNumber } from "lib/numbers";
import { USD_DECIMALS } from "sdk/configs/factors";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";

import { CompositionItem, getCompositionPercentage } from "../hooks/useCompositionData";

interface Props {
  data: CompositionItem[];
  label: ReactNode;
}

export function CompositionDiagram({ data, label }: Props) {
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
      <p className="text-body-medium numbers">{getCompositionPercentage(value, sum)}%</p>
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

export function CompositionChart({ items, label }: CompositionChartProps) {
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0);
  }, [items]);

  const itemsWithStyles = useMemo(() => {
    return items.map((item) => ({
      ...item,
      style: { background: item.color, width: `${(item.value / total) * 100}%` },
    }));
  }, [items, total]);

  return (
    <div className="flex w-full flex-col gap-16">
      <div className="flex w-full gap-2">
        {itemsWithStyles.map((item) => (
          <div key={item.key} className="h-12 rounded-2" style={item.style}>
            <Tooltip
              content={<div className="w-fit">{item.tooltipContent}</div>}
              handle={<div></div>}
              handleClassName="!block h-full w-full"
              className="block h-full w-full"
              tooltipClassName="!min-w-fit"
              position="bottom"
            />
          </div>
        ))}
      </div>

      <div className="text-caption">{label}</div>
    </div>
  );
}
