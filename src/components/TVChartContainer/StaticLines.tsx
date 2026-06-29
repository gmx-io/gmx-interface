import { useCallback } from "react";

import { useClosingPositionKeyState } from "context/SyntheticsStateContext/hooks/globalsHooks";

import { StaticLine } from "./StaticLine";
import type { StaticChartLine } from "./types";
import type { IChartingLibraryWidget } from "../../charting_library";

export function StaticLines({
  chartLines,
  tvWidgetRef,
  bodyFontSizePt,
}: {
  chartLines: Array<StaticChartLine & { lineLength: number }>;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  bodyFontSizePt: number;
}) {
  const [, setClosingPositionKey] = useClosingPositionKeyState();

  const onClosePosition = useCallback(
    (positionKey: string) => {
      setClosingPositionKey(positionKey);
    },
    [setClosingPositionKey]
  );

  return chartLines.map((line) => (
    <StaticLine
      key={line.id}
      tvWidgetRef={tvWidgetRef}
      bodyFontSizePt={bodyFontSizePt}
      onClose={onClosePosition}
      {...line}
    />
  ));
}
