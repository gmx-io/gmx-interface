import { useMemo } from "react";

import { TOKEN_COLOR_MAP } from "config/tokens";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { getPoolUsdWithoutPnl, MarketInfo } from "domain/synthetics/markets";
import { isGlv } from "domain/synthetics/markets/glv";
import { GlvPoolInfo } from "domain/synthetics/tokens/useGlvPools";

import { bigMath } from "lib/bigmath";

interface CompositionBarProps {
  marketInfo?: MarketInfo | GlvPoolInfo;
}

export function CompositionBar({ marketInfo }: CompositionBarProps) {
  const tokensData = useSelector(selectTokensData);
  const data = useMemo(() => {
    if (!marketInfo) {
      return [];
    }

    if (isGlv(marketInfo)) {
      return marketInfo.markets.map((market) => {
        return {
          value: market.gmBalance,
          color: tokensData?.[market.address]?.symbol
            ? TOKEN_COLOR_MAP[tokensData?.[market.address]?.symbol]
            : TOKEN_COLOR_MAP.default,
        };
      });
    }

    const { longToken, shortToken } = marketInfo;
    const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
    const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

    return [
      {
        value: longPoolAmountUsd,
        color: longToken ? TOKEN_COLOR_MAP[longToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
      {
        value: shortPoolAmountUsd,
        color: shortToken ? TOKEN_COLOR_MAP[shortToken?.symbol] || TOKEN_COLOR_MAP.default : TOKEN_COLOR_MAP.default,
      },
    ];
  }, [marketInfo, tokensData]);

  const sum = data.reduce((acc, { value }) => acc + (value ?? 0n), 0n);
  const percents = data.map(({ value }) => (value === undefined || sum === 0n ? 0n : bigMath.mulDiv(value, 100n, sum)));

  return (
    <div className="relative mt-10 h-8 overflow-hidden rounded-2">
      {data.map(({ color, value }, index) => {
        if (value === undefined) {
          return null;
        }
        const widthPc = percents[index].toString();
        const previousWidthPc = index ? percents[index - 1]?.toString() : "0";

        return (
          <div
            key={`comp-pc-${index}`}
            className="[&:not(:last-child)]:border-r-1 absolute left-0 top-0 h-8 border-slate-800"
            style={{ width: `${widthPc}%`, backgroundColor: color, left: previousWidthPc + "%" }}
          />
        );
      })}
    </div>
  );
}
