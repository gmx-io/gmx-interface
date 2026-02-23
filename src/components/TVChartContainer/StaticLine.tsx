import { useEffect, useRef, useState } from "react";
import { useLatest } from "react-use";

import { useTheme } from "context/ThemeContext/ThemeContext";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import { chartLabelColors } from "./constants";
import { LineStyle, StaticChartLine } from "./types";
import type { IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";

export function StaticLine({
  title,
  price,
  positionData,
  lineType,
  tvWidgetRef,
  lineLength = -40,
  bodyFontSizePt = 12,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  lineLength?: number;
  bodyFontSizePt?: number;
} & StaticChartLine) {
  const { theme } = useTheme();
  const lineApi = useRef<IPositionLineAdapter | undefined>(undefined);
  const [showSizeInUsd, setShowSizeInUsd] = useState(true);

  const isPositionEntry = !!positionData;
  const isLiquidation = lineType === "liquidation";
  const isProfit = positionData ? positionData.pnl > 0n : false;
  const isLoss = positionData ? positionData.pnl < 0n : false;

  const isGreen = isPositionEntry ? isProfit : false;
  const isRed = isPositionEntry ? isLoss : isLiquidation;

  const palette = isGreen ? chartLabelColors.green : isRed ? chartLabelColors.red : chartLabelColors.neutral;

  const lineColor = palette.line[theme];
  const bodyBgColor = palette.bg[theme];
  const bodyTextColor = palette.text[theme];
  const bodyBorderColor = bodyBgColor;

  const getDisplayText = (sizeInUsd: boolean) => {
    if (!positionData) return title;

    const pnlFormatted = formatUsd(positionData.pnl, { displayPlus: true }) ?? "$0.00";
    const sizeFormatted = sizeInUsd
      ? formatUsd(positionData.sizeInUsd) ?? "$0.00"
      : `${formatTokenAmount(positionData.sizeInTokens, positionData.tokenDecimals) ?? "0"} ${positionData.tokenSymbol}`;

    return `${title} · PnL ${pnlFormatted} · ${sizeFormatted}`;
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
        .setExtendLeft(false)
        .setLineLength(lineLengthRef.current, "pixel")
        .setBodyFont(`normal ${bodyFontSizePt}pt "Relative", sans-serif`)
        .setBodyTextColor(bodyTextColor)
        .setLineColor(lineColor)
        .setBodyBackgroundColor(bodyBgColor)
        .setBodyBorderColor(bodyBorderColor);

      if (isPositionEntry) {
        positionLine
          .setQuantity("\u21C4")
          .setQuantityFont(`normal ${bodyFontSizePt + 2}pt "Relative", sans-serif`)
          .setQuantityBackgroundColor(chartLabelColors.button.bg[theme])
          .setQuantityBorderColor(bodyBorderColor)
          .setQuantityTextColor(chartLabelColors.button.icon[theme])
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
    bodyBgColor,
    bodyTextColor,
    bodyBorderColor,
    isPositionEntry,
    getDisplayTextRef,
    showSizeInUsdRef,
    lineLengthRef,
    bodyFontSizePt,
    theme,
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
    lineApi.current.setBodyBackgroundColor(bodyBgColor);
    lineApi.current.setBodyBorderColor(bodyBorderColor);
    lineApi.current.setQuantityBorderColor(bodyBorderColor);
  }, [displayText, bodyBgColor, bodyBorderColor, lineColor, isPositionEntry]);

  return null;
}
