import { CSSProperties, memo, useMemo } from "react";

import type { CrosshairPercentageState } from "./useCrosshairPercentage";

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
    <div
      className="leading-none pointer-events-none absolute z-10 box-border flex flex-col items-center gap-2 whitespace-nowrap rounded-2 bg-[#131722] px-8 py-4 text-11 font-medium text-white dark:bg-[#363a45]"
      style={style}
    >
      <div className="text-14 leading-[16px]">{formattedPrice}</div>
      <div className="text-11 leading-[13px]">{formattedPercentage}</div>
    </div>
  );
}

export const CrosshairPercentageLabel = memo(CrosshairPercentageLabelComponent);
