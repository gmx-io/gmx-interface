import { useMemo } from "react";

import { TOKEN_COLOR_MAP } from "config/tokens";

import {
  getMarketIndexName,
  getPoolUsdWithoutPnl,
  GlvAndGmMarketsInfoData,
  GlvOrMarketInfo,
  isMarketInfo,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { TokensData } from "domain/synthetics/tokens";
import { bigintToNumber } from "lib/numbers";
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

    if (isGlvInfo(marketInfo)) {
      return marketInfo.markets
        .map((market) => {
          const marketInfo = marketsInfoData?.[market.address];

          if (marketInfo && isMarketInfo(marketInfo)) {
            const token = marketInfo.indexToken?.symbol;
            const marketToken = marketTokensData?.[marketInfo.marketTokenAddress];

            return {
              tooltipContent: marketInfo ? getMarketIndexName(marketInfo) : "",
              market: marketInfo,
              value: convertToUsd(market.gmBalance, marketToken?.decimals, marketToken?.prices.maxPrice) ?? 0n,
              color: token ? TOKEN_COLOR_MAP[token] ?? TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
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
        value: longPoolAmountUsd,
        color: longToken ? TOKEN_COLOR_MAP[longToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
      {
        tooltipContent: shortToken.symbol,
        value: shortPoolAmountUsd,
        color: shortToken ? TOKEN_COLOR_MAP[shortToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
    ];
  }, [marketInfo, marketsInfoData, marketTokensData]);

  const sum = data.reduce((acc, { value }) => acc + (value ?? 0n), 0n);
  const percents = data.map(({ value }) =>
    sum === 0n ? 0 : (bigintToNumber(value, 30) * 100) / bigintToNumber(sum, 30)
  );

  const bars = useMemo(() => {
    let previousWidthPc = 0;
    return data.map(({ color, value, tooltipContent }, index) => {
      if (value === undefined) {
        return null;
      }
      const percentage = percents[index].toFixed(2);

      previousWidthPc += index ? percents[index - 1] : 0;

      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      const positionStyles = { width: `${percentage}%`, left: previousWidthPc.toFixed(2) + "%" };

      return (
        <TooltipWithPortal
          tooltipClassName="!min-w-[16rem]"
          className="!absolute h-8 whitespace-nowrap border-slate-800 [&:not(:last-child)]:border-r"
          style={positionStyles}
          handleClassName="!absolute h-8 w-[100%]"
          key={`comp-pc-${index}`}
          handle={
            <div
              className="absolute left-0 top-0 h-8 w-[100%] cursor-pointer"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              style={{ backgroundColor: color }}
            />
          }
          disableHandleStyle
          content={
            <>
              {percentage}% {tooltipContent}
            </>
          }
        />
      );
    });
  }, [data, percents]);

  return <div className="relative mt-10 h-8 overflow-hidden rounded-2">{bars}</div>;
}
