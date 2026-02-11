import { CSSProperties, memo, useMemo } from "react";

import type { CrosshairPercentageState } from "./useCrosshairPercentage";

import "./CrosshairPercentageLabel.scss";

interface CrosshairPercentageLabelProps {
  state: CrosshairPercentageState;
}

function CrosshairPercentageLabelComponent({ state }: CrosshairPercentageLabelProps) {
  const { formattedPrice, percentage, offsetY, priceAxisCenterX, priceAxisWidth, isVisible } = state;

  const style = useMemo<CSSProperties>(() => {
    if (priceAxisCenterX === null) {
      return { top: offsetY, right: 4, transform: "translateY(-12px)" };
    }

    return {
      top: offsetY,
      left: priceAxisCenterX,
      width: priceAxisWidth ?? undefined,
      transform: "translate(-50%, -12px)",
    };
  }, [offsetY, priceAxisCenterX, priceAxisWidth]);

  if (!isVisible) {
    return null;
  }

  const formattedPercentage = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;

  return (
    <div className="CrosshairPercentageLabel" style={style}>
      <div className="CrosshairPercentageLabel-price">{formattedPrice}</div>
      <div className="CrosshairPercentageLabel-percentage">{formattedPercentage}</div>
    </div>
  );
}

export const CrosshairPercentageLabel = memo(CrosshairPercentageLabelComponent);
