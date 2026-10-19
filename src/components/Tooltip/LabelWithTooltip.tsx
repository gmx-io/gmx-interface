import type { ReactNode } from "react";

import InfoIcon from "img/ic_info_circle.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import type { TooltipPosition } from "./Tooltip";
import TooltipWithPortal from "./TooltipWithPortal";

type Props = {
  label: string;
  tooltip: ReactNode;
  position?: TooltipPosition;
  variant?: "icon" | "iconStroke";
  className?: string;
  labelClassName?: string;
};

export function LabelWithTooltip({ label, tooltip, position, variant = "icon", className, labelClassName }: Props) {
  // Keep the info icon glued to the last word so it never wraps onto a line by itself.
  const trimmed = label.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  const head = lastSpace === -1 ? "" : trimmed.slice(0, lastSpace + 1);
  const lastWord = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1);
  const Icon = variant === "iconStroke" ? InfoIconStroke : InfoIcon;

  return (
    <TooltipWithPortal
      className={className}
      position={position}
      variant="none"
      content={tooltip}
      handle={
        <span className={labelClassName}>
          {head}
          <span className="whitespace-nowrap">
            {lastWord}
            <Icon className="ml-2 inline-block size-16 align-middle" />
          </span>
        </span>
      }
    />
  );
}
