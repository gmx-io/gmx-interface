import cx from "classnames";

import { formatMultiplier } from "domain/synthetics/incentives/utils";

import MultiplierSolidIcon from "img/ic_multiplier_solid.svg?react";

type Props = {
  multiplier: number | undefined;
};

export function MultiplierBadge({ multiplier }: Props) {
  const hasMultiplier = multiplier !== undefined && multiplier > 0;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-3 rounded-full py-2 pl-4 pr-6 text-12 font-medium",
        hasMultiplier ? "bg-green-900 text-green-500" : "border-1/2 border-slate-600 text-typography-secondary"
      )}
    >
      <MultiplierSolidIcon className="size-12" />
      {hasMultiplier ? formatMultiplier(multiplier) : "0x"}
    </span>
  );
}
