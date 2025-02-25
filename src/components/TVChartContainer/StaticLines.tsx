import type { IChartingLibraryWidget } from "../../charting_library";
import type { StaticChartLine } from "./types";
import { StaticLine } from "./StaticLine";

export function StaticLines({
  chartLines,
  tvWidgetRef,
}: {
  chartLines: StaticChartLine[];
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
}) {
  return chartLines.map((line) => <StaticLine key={line.title} tvWidgetRef={tvWidgetRef} {...line} />);
}
