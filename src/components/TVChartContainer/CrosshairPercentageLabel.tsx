import { CSSProperties, memo, useMemo } from "react";

import type { CrosshairPercentageState } from "./useCrosshairPercentage";

import "./CrosshairPercentageLabel.scss";

interface CrosshairPercentageLabelProps {
  state: CrosshairPercentageState;
}

function CrosshairPercentageLabelComponent({ state }: CrosshairPercentageLabelProps) {
  const { percentage, offsetY, isVisible } = state;

  const style = useMemo<CSSProperties>(() => ({ top: offsetY }), [offsetY]);

  if (!isVisible) {
    return null;
  }

  const formattedPercentage = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;

  return (
    <div className="CrosshairPercentageLabel" style={style}>
      {formattedPercentage}
    </div>
  );
}

export const CrosshairPercentageLabel = memo(CrosshairPercentageLabelComponent);
