import { useEffect, useRef } from "react";

import type { IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { LineStyle, StaticChartLine } from "./types";

export function StaticLine({
  title,
  price,
  tvWidgetRef,
}: {
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
} & StaticChartLine) {
  const lineApi = useRef<IPositionLineAdapter | undefined>(undefined);

  useEffect(() => {
    const chart = tvWidgetRef.current?.activeChart();
    if (!chart || !chart.dataReady()) {
      return;
    }

    const range = chart.getVisibleRange();

    if (range.from === 0 && range.to === 0) {
      chart.onVisibleRangeChanged().subscribe(null, init, true);
    } else {
      init();
    }

    function init() {
      const positionLine = chart!.createPositionLine({ disableUndo: true });

      lineApi.current = positionLine;

      return positionLine
        .setText(title)
        .setPrice(price)
        .setQuantity("")
        .setLineStyle(LineStyle.Dotted)
        .setLineLength(1)
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
  }, [price, title, tvWidgetRef]);

  return null;
}
