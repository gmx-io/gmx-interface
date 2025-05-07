import { Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import {
  getMarketIndexName,
  getPoolUsdWithoutPnl,
  GlvAndGmMarketsInfoData,
  GlvOrMarketInfo,
  isMarketInfo,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokensData } from "domain/synthetics/tokens";
import { bigintToNumber } from "lib/numbers";
import { USD_DECIMALS } from "sdk/configs/factors";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import { convertToUsd } from "../../../../domain/synthetics/tokens/utils";

interface CompositionBarProps {
  marketInfo: GlvOrMarketInfo | undefined;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
}

export function CompositionBar({ marketInfo, marketsInfoData, marketTokensData }: CompositionBarProps) {
  const data = useMemo(() => {
    if (!marketInfo) {
      return [];
    }

    const sum = isGlvInfo(marketInfo)
      ? marketInfo.markets.reduce((acc, market) => {
          const info = marketsInfoData?.[market.address];
          if (info && isMarketInfo(info)) {
            const token = marketTokensData?.[info?.marketTokenAddress];

            return (
              acc +
              bigintToNumber(
                convertToUsd(market.gmBalance, token?.decimals, token?.prices.maxPrice) ?? 0n,
                USD_DECIMALS
              )
            );
          }

          return acc;
        }, 0)
      : marketInfo
        ? bigintToNumber(
            getPoolUsdWithoutPnl(marketInfo, true, "midPrice") + getPoolUsdWithoutPnl(marketInfo, false, "midPrice"),
            USD_DECIMALS
          )
        : 0;

    if (isGlvInfo(marketInfo)) {
      return marketInfo.markets
        .map((market) => {
          const marketInfo = marketsInfoData?.[market.address];

          if (marketInfo && isMarketInfo(marketInfo)) {
            const token = marketInfo.indexToken?.symbol;
            const marketToken = marketTokensData?.[marketInfo.marketTokenAddress];
            const value = bigintToNumber(
              convertToUsd(market.gmBalance, marketToken?.decimals, marketToken?.prices.maxPrice) ?? 0n,
              USD_DECIMALS
            );
            const color = token ? TOKEN_COLOR_MAP[token] ?? TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default;
            const tooltipContent = makeTooltipContent({
              color,
              value,
              sum,
              name: getMarketIndexName(marketInfo),
            });

            return {
              tooltipContent,
              value,
              color,
            };
          }
        })
        .filter(Boolean as unknown as FilterOutFalsy)
        .sort((a, b) => (b.value > a.value ? 1 : -1));
    }

    const { longToken, shortToken } = marketInfo;
    const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
    const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

    return [
      {
        tooltipContent: longToken.symbol,
        value: bigintToNumber(longPoolAmountUsd ?? 0n, USD_DECIMALS),
        color: longToken ? TOKEN_COLOR_MAP[longToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
      {
        tooltipContent: shortToken.symbol,
        value: bigintToNumber(shortPoolAmountUsd ?? 0n, USD_DECIMALS),
        color: shortToken ? TOKEN_COLOR_MAP[shortToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
    ];
  }, [marketInfo, marketsInfoData, marketTokensData]);

  // const bars = useMemo(() => {
  //   let previousWidthPc = 0;
  //   return data.map(({ color, value, tooltipContent }, index) => {
  //     if (value === undefined) {
  //       return null;
  //     }
  //     const percentage = percents[index].toFixed(2);

  //     previousWidthPc += index ? percents[index - 1] : 0;

  //     // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  //     const positionStyles = { width: `${percentage}%`, left: previousWidthPc.toFixed(2) + "%" };

  //     return (
  //       <TooltipWithPortal
  //         tooltipClassName="!min-w-[16rem]"
  //         className="!absolute h-8 whitespace-nowrap border-slate-800 [&:not(:last-child)]:border-r"
  //         style={positionStyles}
  //         handleClassName="!absolute h-8 w-[100%]"
  //         key={`comp-pc-${index}`}
  //         handle={
  //           <div
  //             className="absolute left-0 top-0 h-8 w-[100%] cursor-pointer"
  //             // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  //             style={{ backgroundColor: color }}
  //           />
  //         }
  //         disableHandleStyle
  //         content={
  //           <>
  //             {percentage}% {tooltipContent}
  //           </>
  //         }
  //       />
  //     );
  //   });
  // }, [data, percents]);

  return (
    <div>
      <CompositionChart items={data} label={<Trans>Market Composition</Trans>} />
    </div>
  );
}

const makeTooltipContent = ({
  color,
  value,
  sum,
  name,
}: {
  color: string;
  value: number;
  sum: number;
  name: string;
}) => {
  return (
    <div className="flex items-center gap-4 rounded-4 bg-slate-600">
      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-body-medium">{name}:</p>
      <p className="text-body-medium">{Math.round((value / sum) * 100)}%</p>
    </div>
  );
};

interface CompositionChartProps {
  items: CompositionItem[];
  label: ReactNode;
}

type CompositionItem = {
  tooltipContent: ReactNode;
  value: number;
  color: string;
};

const CompositionTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as CompositionItem;

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
        >
          {items.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} style={CELL_STYLE} />
          ))}
        </Pie>

        <Tooltip content={CompositionTooltip} />
      </PieChart>
    </div>
  );
}
