import type { IChartingLibraryWidget } from "../../charting_library";
import type { StaticChartLine } from "./types";
import { StaticLine } from "./StaticLine";

export function StaticLines({
  isMobile,
  chartLines,
  tvWidgetRef,
}: {
  isMobile: boolean;
  chartLines: StaticChartLine[];
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
}) {
  return chartLines.map((line) => (
    <StaticLine key={line.title} isMobile={isMobile} tvWidgetRef={tvWidgetRef} {...line} />
  ));
}
