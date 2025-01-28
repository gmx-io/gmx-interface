import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { TokenData, TokensRatio, convertToTokenAmount, getTokensRatioByPrice } from "domain/synthetics/tokens";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

import { USD_DECIMALS } from "config/factors";
import { calculateDisplayDecimals, formatAmount, formatTokenAmount, formatUsd, formatUsdPrice } from "lib/numbers";

export type Props = {
  maxLiquidityUsd?: bigint;
  fromToken?: TokenData;
  toToken?: TokenData;
  markRatio?: TokensRatio;
};

export function SwapCard(p: Props) {
  const { fromToken, toToken, maxLiquidityUsd } = p;

  const maxLiquidityAmount = convertToTokenAmount(maxLiquidityUsd, toToken?.decimals, toToken?.prices?.maxPrice);

  const ratioStr = useMemo(() => {
    if (!fromToken || !toToken) return "...";

    const markRatio = getTokensRatioByPrice({
      fromToken,
      toToken,
      fromPrice: fromToken.prices.minPrice,
      toPrice: toToken.prices.maxPrice,
    });

    const smallest = markRatio.smallestToken;
    const largest = markRatio.largestToken;

    const ratioDecimals = calculateDisplayDecimals(markRatio.ratio);

    return `${formatAmount(markRatio.ratio, USD_DECIMALS, ratioDecimals)} ${smallest.symbol} / ${largest.symbol}`;
  }, [fromToken, toToken]);

  const maxOutValue = useMemo(
    () => [
      formatTokenAmount(maxLiquidityAmount, toToken?.decimals, toToken?.symbol, {
        useCommas: true,
        displayDecimals: 0,
      }),
      `(${formatUsd(maxLiquidityUsd, { displayDecimals: 0 })})`,
    ],
    [maxLiquidityAmount, maxLiquidityUsd, toToken?.decimals, toToken?.symbol]
  );

  return (
    <div className="text-body-medium relative mt-12 rounded-4 bg-slate-800 p-15 max-[1100px]:mt-0">
      <div className="text-[15px]">
        <Trans>Swap</Trans>
      </div>
      <div className="my-15 h-1 bg-stroke-primary" />

      <div className="flex flex-col gap-14">
        <SyntheticsInfoRow
          label={t`${fromToken?.symbol} Price`}
          value={formatUsdPrice(fromToken?.prices?.minPrice) || "..."}
        />

        <SyntheticsInfoRow
          label={t`${toToken?.symbol} Price`}
          value={formatUsdPrice(toToken?.prices?.maxPrice) || "..."}
        />

        <SyntheticsInfoRow
          label={t`Available Liquidity`}
          value={
            <Tooltip
              handle={formatUsd(maxLiquidityUsd) || "..."}
              position="left-start"
              content={
                <StatsTooltipRow
                  textClassName="al-swap"
                  label={t`Max ${toToken?.symbol} out`}
                  value={maxOutValue}
                  showDollar={false}
                />
              }
            />
          }
        />

        <SyntheticsInfoRow label={t`Price`} value={ratioStr} />
      </div>
    </div>
  );
}
