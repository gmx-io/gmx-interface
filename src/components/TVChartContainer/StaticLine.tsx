import { useEffect, useRef, useState } from "react";
import { useLatest } from "react-use";

import { formatTokenAmount, formatUsd } from "lib/numbers";

import { LineStyle, StaticChartLine } from "./types";
import type { IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";

const PROFIT_COLOR = "#0ecc83";
const LOSS_COLOR = "#fa3c58";
const NEUTRAL_COLOR = "#3a3e5e";

export function StaticLine({
  title,
  price,
  positionData,
  tvWidgetRef,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
} & StaticChartLine) {
  const lineApi = useRef<IPositionLineAdapter | undefined>(undefined);
  const [showSizeInUsd, setShowSizeInUsd] = useState(true);

  const isPositionEntry = !!positionData;
  const isProfit = positionData ? positionData.pnl > 0n : false;
  const isLoss = positionData ? positionData.pnl < 0n : false;

  const lineColor = isPositionEntry ? (isProfit ? PROFIT_COLOR : isLoss ? LOSS_COLOR : NEUTRAL_COLOR) : NEUTRAL_COLOR;

  const getDisplayText = (sizeInUsd: boolean) => {
    if (!positionData) return title;

    const pnlFormatted = formatUsd(positionData.pnl, { displayPlus: true }) ?? "$0.00";
    const sizeFormatted = sizeInUsd
      ? formatUsd(positionData.sizeInUsd) ?? "$0.00"
      : formatTokenAmount(positionData.sizeInTokens, positionData.tokenDecimals) ?? "0";

    return `PNL ${pnlFormatted} - ${sizeFormatted} - ${title}`;
  };

  const showSizeInUsdRef = useLatest(showSizeInUsd);

  useEffect(() => {
    const chart = tvWidgetRef.current?.activeChart();
    if (!chart) {
      return;
    }

    chart.dataReady(() => {
      const range = chart.getVisibleRange();

      if (range.from === 0 && range.to === 0) {
        chart.onVisibleRangeChanged().subscribe(null, init, true);
      } else {
        init();
      }
    });

    function init() {
      const positionLine = chart!.createPositionLine({ disableUndo: true });

      lineApi.current = positionLine;

      const displayText = getDisplayText(showSizeInUsdRef.current);

      positionLine
        .setText(displayText)
        .setPrice(price)
        .setLineStyle(LineStyle.Dashed)
        .setLineLength(-40, "pixel")
        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setLineColor(lineColor)
        .setBodyBackgroundColor(lineColor)
        .setBodyBorderColor(lineColor);

      if (isPositionEntry) {
        positionLine
          .setQuantity("\u21C4")
          .setQuantityFont(`normal 14pt "Relative", sans-serif`)
          .setQuantityBackgroundColor("#121421")
          .setQuantityBorderColor(lineColor)
          .setQuantityTextColor("#fff")
          .onModify(() => {
            setShowSizeInUsd((prev) => {
              const newValue = !prev;
              lineApi.current?.setText(getDisplayText(newValue));
              return newValue;
            });
          });
      } else {
        positionLine.setQuantity("");
      }
    }

    return () => {
      lineApi.current?.remove();
      lineApi.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, title, tvWidgetRef, lineColor, isPositionEntry]);

  // Update text when positionData changes (PnL updates in real-time)
  useEffect(() => {
    if (lineApi.current && positionData) {
      const displayText = getDisplayText(showSizeInUsd);
      lineApi.current.setText(displayText);
      lineApi.current.setLineColor(lineColor);
      lineApi.current.setBodyBackgroundColor(lineColor);
      lineApi.current.setBodyBorderColor(lineColor);
      if (isPositionEntry) {
        lineApi.current.setQuantityBorderColor(lineColor);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionData?.pnl, positionData?.sizeInUsd, positionData?.sizeInTokens, lineColor]);

  return null;
}
