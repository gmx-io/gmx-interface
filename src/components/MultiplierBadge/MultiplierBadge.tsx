import cx from "classnames";

import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";

import MultiplierSolidIcon from "img/ic_multiplier_solid.svg?react";

type Props = {
  multiplier: bigint | undefined;
  multiplierDecimals: bigint;
};

export function MultiplierBadge({ multiplier, multiplierDecimals }: Props) {
  const hasMultiplier = multiplier !== undefined && multiplier > 0n;

  return (
    <span
      aria-hidden={multiplier === undefined ? "true" : undefined}
      className={cx(
        "inline-flex min-w-[49px] shrink-0 items-center justify-center gap-3 rounded-full py-2 pl-4 pr-6 text-12 font-medium",
        hasMultiplier ? "bg-green-900 text-green-500" : "border-1/2 border-slate-600 text-typography-disabled"
      )}
    >
      <MultiplierSolidIcon aria-hidden="true" className="size-12" />
      {hasMultiplier ? formatMultiplier(multiplier, multiplierDecimals) : multiplier === 0n ? "0.0x" : "-"}
    </span>
  );
}
