import type { ReactNode } from "react";

import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import StandardTooltip, { type StandardTooltipPosition } from "./StandardTooltip";

type Props = {
  label: string;
  tooltip: ReactNode;
  position?: StandardTooltipPosition;
  className?: string;
  labelClassName?: string;
};

export function LabelWithTooltip({ label, tooltip, position, className, labelClassName }: Props) {
  // Keep the info icon glued to the last word so it never wraps onto a line by itself.
  const trimmed = label.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  const head = lastSpace === -1 ? "" : trimmed.slice(0, lastSpace + 1);
  const lastWord = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1);

  return (
    <StandardTooltip
      className={className}
      position={position}
      variant="none"
      content={tooltip}
      handle={
        <span className={labelClassName}>
          {head}
          <span className="whitespace-nowrap">
            {lastWord}
            <InfoIconStroke className="ml-2 inline-block size-16 align-middle" />
          </span>
        </span>
      }
    />
  );
}
