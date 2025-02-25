import { useEffect, useRef } from "react";

import type { IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { LineStyle, StaticChartLine } from "./types";

export function StaticLine({
  isMobile,
  title,
  price,
  tvWidgetRef,
}: {
  isMobile: boolean;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
} & StaticChartLine) {
  const lineApi = useRef<IPositionLineAdapter | undefined>(undefined);

  useEffect(() => {
    if (!tvWidgetRef.current?.activeChart().dataReady()) {
      return;
    }
    const chart = tvWidgetRef.current.activeChart();

    const range = chart.getVisibleRange();

    if (range.from === 0 && range.to === 0) {
      chart.onVisibleRangeChanged().subscribe(null, init, true);
    } else {
      init();
    }

    function init() {
      const positionLine = chart.createPositionLine({ disableUndo: true });

      lineApi.current = positionLine;

      if (isMobile) {
        positionLine.setLineLength(-1, "pixel");
      } else {
        positionLine.setLineLength(1);
      }

      return positionLine
        .setText(title)
        .setPrice(price)
        .setQuantity("")
        .setLineStyle(LineStyle.Dotted)
        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setLineColor("#3a3e5e")
        .setBodyBackgroundColor("#3a3e5e")
        .setBodyBorderColor("#3a3e5e");
    }

    return () => {
      lineApi.current?.remove();
      lineApi.current = undefined;
    };
  }, [isMobile, price, title, tvWidgetRef]);

  return null;
}
