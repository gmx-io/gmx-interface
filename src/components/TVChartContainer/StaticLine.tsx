import { useEffect, useRef, useState } from "react";
import { useLatest } from "react-use";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import { LineStyle, StaticChartLine } from "./types";
import type { IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";

const NEUTRAL_COLOR = "#3a3e5e";

export function StaticLine({
  title,
  price,
  positionData,
  lineType,
  tvWidgetRef,
  lineLength = -40,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  lineLength?: number;
} & StaticChartLine) {
  const { theme } = useTheme();
  const lineApi = useRef<IPositionLineAdapter | undefined>(undefined);
  const [showSizeInUsd, setShowSizeInUsd] = useState(true);

  const isPositionEntry = !!positionData;
  const isLiquidation = lineType === "liquidation";
  const isProfit = positionData ? positionData.pnl > 0n : false;
  const isLoss = positionData ? positionData.pnl < 0n : false;

  const lineColor = isPositionEntry
    ? isProfit
      ? colors.green[500][theme]
      : isLoss
        ? colors.red[500][theme]
        : NEUTRAL_COLOR
    : isLiquidation
      ? colors.red[500][theme]
      : NEUTRAL_COLOR;

  const lineBorderColor = isPositionEntry
    ? isProfit
      ? colors.green[800][theme]
      : isLoss
        ? colors.red[700][theme]
        : colors.slate[600].dark
    : isLiquidation
      ? colors.red[700][theme]
      : colors.slate[600].dark;

  const getDisplayText = (sizeInUsd: boolean) => {
    if (!positionData) return title;

    const pnlFormatted = formatUsd(positionData.pnl, { displayPlus: true }) ?? "$0.00";
    const sizeFormatted = sizeInUsd
      ? formatUsd(positionData.sizeInUsd) ?? "$0.00"
      : formatTokenAmount(positionData.sizeInTokens, positionData.tokenDecimals) ?? "0";

    return `PNL ${pnlFormatted} - ${sizeFormatted} - ${title}`;
  };

  const showSizeInUsdRef = useLatest(showSizeInUsd);
  const getDisplayTextRef = useLatest(getDisplayText);
  const lineLengthRef = useLatest(lineLength);

  useEffect(() => {
    const chart = tvWidgetRef.current?.activeChart();
    if (!chart) {
      return;
    }

    let cancelled = false;

    const init = () => {
      if (cancelled) {
        return;
      }

      lineApi.current?.remove();

      const positionLine = chart!.createPositionLine({ disableUndo: true });

      lineApi.current = positionLine;

      const displayText = getDisplayTextRef.current(showSizeInUsdRef.current);

      positionLine
        .setText(displayText)
        .setPrice(price)
        .setLineStyle(LineStyle.Dashed)
        .setLineLength(lineLengthRef.current, "pixel")
        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setLineColor(lineColor)
        .setBodyBackgroundColor(lineColor)
        .setBodyBorderColor(lineBorderColor);

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
              lineApi.current?.setText(getDisplayTextRef.current(newValue));
              return newValue;
            });
          });
      } else {
        positionLine.setQuantity("");
      }
    };

    chart.dataReady(() => {
      if (cancelled) {
        return;
      }

      const range = chart.getVisibleRange();

      if (range.from === 0 && range.to === 0) {
        chart.onVisibleRangeChanged().subscribe(null, init, true);
      } else {
        init();
      }
    });

    return () => {
      cancelled = true;
      chart.onVisibleRangeChanged().unsubscribe(null, init);

      lineApi.current?.remove();
      lineApi.current = undefined;
    };
  }, [
    price,
    title,
    tvWidgetRef,
    lineColor,
    lineBorderColor,
    isPositionEntry,
    getDisplayTextRef,
    showSizeInUsdRef,
    lineLengthRef,
  ]);

  useEffect(() => {
    if (!lineApi.current) return;

    lineApi.current.setLineLength(lineLength, "pixel");
  }, [lineLength]);

  const displayText = getDisplayText(showSizeInUsd);

  useEffect(() => {
    if (!lineApi.current || !isPositionEntry) return;

    lineApi.current.setText(displayText);
    lineApi.current.setLineColor(lineColor);
    lineApi.current.setBodyBackgroundColor(lineColor);
    lineApi.current.setBodyBorderColor(lineBorderColor);
    lineApi.current.setQuantityBorderColor(lineColor);
  }, [displayText, lineBorderColor, lineColor, isPositionEntry]);

  return null;
}
