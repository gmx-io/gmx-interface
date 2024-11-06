import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";
import type { TooltipProps } from "recharts";
import { useViewBox, useYAxisWithFiniteDomainOrRandom } from "recharts/es6/context/chartLayoutContext";

import { getFeeItem } from "domain/synthetics/fees/utils";
import { formatPercentage, formatUsd, formatUsdPrice } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import type { DataPoint } from "./DepthChart";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

const LEFT_OPAQUE_TOOLTIP = (
  <Trans>
    Execution prices for increasing shorts and
    <br />
    decreasing longs.
  </Trans>
);

const RIGHT_OPAQUE_TOOLTIP = (
  <Trans>
    Execution prices for increasing longs and
    <br />
    decreasing shorts.
  </Trans>
);

const LEFT_OPAQUE_NO_PRICE_IMPACT_TOOLTIP = (
  <Trans>
    There is no price impact. There is a single
    <br />
    execution price for increasing shorts or
    <br />
    decreasing longs for this size.
  </Trans>
);

const RIGHT_OPAQUE_NO_PRICE_IMPACT_TOOLTIP = (
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
  coordinate,
}: TooltipProps<number | string, string> & { leftMin: bigint; rightMin: bigint; isZeroPriceImpact: boolean }) {
  const viewBox = useViewBox() as {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const yAxis = useYAxisWithFiniteDomainOrRandom() as {
    domain: [number, number];
  };

  if (!active || !payload || !payload.length) {
    return null;
  }

  let stats: DataPoint = payload[0].payload as DataPoint;
  let size = stats.sizeBigInt;

  let isOpaqueCloser = true;
  let isLeft = false;

  if (isZeroPriceImpact) {
    const dataPoint = payload[0].payload as DataPoint;

    isLeft = dataPoint.leftTransparentSize !== null || dataPoint.leftOpaqueSize !== null;

    const transparentSize: number | null = isLeft ? dataPoint.leftTransparentSize : dataPoint.rightTransparentSize;
    const transparentSizeBigInt: bigint | null = isLeft
      ? dataPoint.leftTransparentSizeBigInt
      : dataPoint.rightTransparentSizeBigInt;

    const opaqueSize: number | null = isLeft ? dataPoint.leftOpaqueSize : dataPoint.rightOpaqueSize;
    const opaqueSizeBigInt = isLeft ? dataPoint.leftOpaqueSizeBigInt : dataPoint.rightOpaqueSizeBigInt;

    if (transparentSize === null && opaqueSize !== null) {
      size = opaqueSizeBigInt!;
    } else if (transparentSize !== null && opaqueSize === null) {
      size = transparentSizeBigInt!;
    } else if (transparentSize !== null && opaqueSize !== null) {
      const transparentFloatY =
        viewBox.height - (transparentSize! / (yAxis.domain[1] - yAxis.domain[0])) * viewBox.height;
      const opaqueFloatY = viewBox.height - (opaqueSize! / (yAxis.domain[1] - yAxis.domain[0])) * viewBox.height;

      const distanceToTransparent = Math.abs((coordinate?.y ?? 0) - viewBox.y - transparentFloatY);
      const distanceToOpaque = Math.abs((coordinate?.y ?? 0) - viewBox.y - opaqueFloatY);

      isOpaqueCloser = distanceToOpaque < distanceToTransparent;

      size = isOpaqueCloser ? opaqueSizeBigInt! : transparentSizeBigInt!;
    }
  }

  const priceImpactFeeItem = getFeeItem(stats.priceImpactBigInt, stats.sizeBigInt);

  let tooltip: ReactNode;

  if (isZeroPriceImpact && isLeft && isOpaqueCloser) {
    tooltip = LEFT_OPAQUE_NO_PRICE_IMPACT_TOOLTIP;
  } else if (isZeroPriceImpact && isLeft && !isOpaqueCloser) {
    tooltip = (
      <Trans>
        No liquidity is available for increasing shorts for
        <br />
        this size. Max short size: {formatUsd(stats.leftOpaqueSizeBigInt!)}
        <br />
        <br />
        There is no price impact. There is a single
        <br />
        execution price for decreasing longs for
        <br />
        this size.
      </Trans>
    );
  } else if (isZeroPriceImpact && !isLeft && isOpaqueCloser) {
    tooltip = RIGHT_OPAQUE_NO_PRICE_IMPACT_TOOLTIP;
  } else if (isZeroPriceImpact && !isLeft && !isOpaqueCloser) {
    tooltip = (
      <Trans>
        No liquidity is available for increasing longs for
        <br />
        this size. Max long size: {formatUsd(stats.rightOpaqueSizeBigInt!)}
        <br />
        <br />
        There is no price impact. There is a single
        <br />
        execution price for decreasing shorts for
        <br />
        this size.
      </Trans>
    );
  } else if (stats.leftOpaqueSize !== null) {
    tooltip = LEFT_OPAQUE_TOOLTIP;
  } else if (stats.rightOpaqueSize !== null) {
    tooltip = RIGHT_OPAQUE_TOOLTIP;
  } else if (stats.leftTransparentSize !== null) {
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
  } else if (stats.rightTransparentSize !== null) {
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
      <StatsTooltipRow label={t`Total size`} value={formatUsd(size)} showDollar={false} />
      <StatsTooltipRow
        label={t`Price Impact`}
        textClassName={getPositiveOrNegativeClass(stats.priceImpactBigInt)}
        value={
          <>
            {formatUsd(stats.priceImpactBigInt)} ({formatPercentage(priceImpactFeeItem?.bps, { signed: true })})
          </>
        }
        showDollar={false}
      />
    </div>
  );
}
