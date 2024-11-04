import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";
import type { TooltipProps } from "recharts";

import { getFeeItem } from "domain/synthetics/fees/utils";
import { formatPercentage, formatUsd, formatUsdPrice } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import type { DataPoint } from "./DepthChart";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

const LEFT_TOOLTIP = (
  <Trans>
    Execution prices for increasing shorts and
    <br />
    decreasing longs.
  </Trans>
);

const RIGHT_TOOLTIP = (
  <Trans>
    Execution prices for increasing longs and
    <br />
    decreasing shorts.
  </Trans>
);

const LEFT_NO_PRICE_IMPACT_TOOLTIP = (
  <Trans>
    There is no price impact. There is a single
    <br />
    execution price for increasing shorts or
    <br />
    decreasing longs for this size.
  </Trans>
);

const RIGHT_NO_PRICE_IMPACT_TOOLTIP = (
  <Trans>
    There is no price impact. There is a single
    <br />
    execution price for increasing longs or
    <br />
    decreasing shorts for this size.
  </Trans>
);

export function ChartTooltip({
  active,
  payload,
  leftMin,
  rightMin,
  isZeroPriceImpact,
}: TooltipProps<number | string, string> & { leftMin: bigint; rightMin: bigint; isZeroPriceImpact: boolean }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as DataPoint;

  const priceImpactFeeItem = getFeeItem(stats.priceImpactBigInt, stats.sizeBigInt);

  let tooltip: ReactNode;

  if (
    isZeroPriceImpact &&
    (stats.longDecreaseAndShortIncreaseSize !== null || stats.longDecreaseXorShortIncreaseSize !== null)
  ) {
    tooltip = LEFT_NO_PRICE_IMPACT_TOOLTIP;
  } else if (
    isZeroPriceImpact &&
    (stats.longIncreaseAndShortDecreaseSize !== null || stats.longIncreaseXorShortDecreaseSize !== null)
  ) {
    tooltip = RIGHT_NO_PRICE_IMPACT_TOOLTIP;
  } else if (stats.longDecreaseAndShortIncreaseSize !== null) {
    tooltip = LEFT_TOOLTIP;
  } else if (stats.longIncreaseAndShortDecreaseSize !== null) {
    tooltip = RIGHT_TOOLTIP;
  } else if (stats.longDecreaseXorShortIncreaseSize !== null) {
    tooltip = (
      <Trans>
        No liquidity is available for increasing shorts for
        <br />
        this size. Max short size: {formatUsd(leftMin)}
        <br />
        <br />
        Execution prices for decreasing longs.
      </Trans>
    );
  } else if (stats.longIncreaseXorShortDecreaseSize !== null) {
    tooltip = (
      <Trans>
        No liquidity is available for increasing longs for
        <br />
        this size. Max long size: {formatUsd(rightMin)}
        <br />
        <br />
        Execution prices for decreasing shorts.
      </Trans>
    );
  }

  return (
    <div className="z-50 rounded-4 border border-gray-950 bg-slate-800 p-8 text-14">
      <p className="mb-8">{tooltip}</p>
      <StatsTooltipRow
        label={t`Execution Price`}
        value={formatUsdPrice(stats.executionPriceBigInt)}
        showDollar={false}
      />
      <StatsTooltipRow label={t`Total size`} value={formatUsd(stats.sizeBigInt)} showDollar={false} />
      <StatsTooltipRow
        label={t`Price Impact`}
        value={
          <>
            {formatUsd(stats.priceImpactBigInt)}{" "}
            <span className={getPositiveOrNegativeClass(stats.priceImpactBigInt)}>
              ({formatPercentage(priceImpactFeeItem?.bps)})
            </span>
          </>
        }
        showDollar={false}
      />
    </div>
  );
}
