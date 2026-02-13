import { StaticLine } from "./StaticLine";
import type { StaticChartLine } from "./types";
import type { IChartingLibraryWidget } from "../../charting_library";

export function StaticLines({
  chartLines,
  tvWidgetRef,
}: {
  chartLines: Array<StaticChartLine & { lineLength: number }>;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
}) {
  return chartLines.map((line) => <StaticLine key={line.id} tvWidgetRef={tvWidgetRef} {...line} />);
}
