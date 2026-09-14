import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { TokenData, TokensRatio, getTokensRatioByPrice } from "domain/synthetics/tokens";
import { calculateDisplayDecimals, formatAmount, formatUsdPrice } from "lib/numbers";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

export type Props = {
  fromToken?: TokenData;
  toToken?: TokenData;
  markRatio?: TokensRatio;
};

export function SwapCard(p: Props) {
  const { fromToken, toToken } = p;

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

  return (
    <div className="text-body-medium relative rounded-4 bg-slate-900 p-15 max-[1024px]:mt-0">
      <div className="text-body-medium mb-14 font-medium">
        <Trans>Swap</Trans>
      </div>

      <div className="flex flex-col gap-14">
        <SyntheticsInfoRow
          label={t`${fromToken?.symbol} price`}
          value={formatUsdPrice(fromToken?.prices?.minPrice) || "..."}
          valueClassName="numbers"
        />

        <SyntheticsInfoRow
          label={t`${toToken?.symbol} price`}
          value={formatUsdPrice(toToken?.prices?.maxPrice) || "..."}
          valueClassName="numbers"
        />

        <SyntheticsInfoRow label={t`Price`} value={ratioStr} valueClassName="numbers" />
      </div>
    </div>
  );
}
