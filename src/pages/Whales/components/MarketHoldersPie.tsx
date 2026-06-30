import { buildPieSlices } from "domain/synthetics/whales/pieSlices";

import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";

const COLORS = ["#3D51FF", "#26A17B", "#E5A700", "#C04EC9", "#1FA8C9", "#D0563B", "#8E7DFF", "#5FB878"];
const OTHERS_COLOR = "#6B7280";

// Pie of holders by share of `total`, with sub-5% holders collapsed into "Others".
export function MarketHoldersPie({
  items,
  total,
  label,
}: {
  items: { name: string; value: bigint }[];
  total: bigint | undefined;
  label: string;
}) {
  const slices = buildPieSlices(items, total ?? 0n).map((slice, i) => ({
    name: slice.name,
    value: slice.value,
    color: slice.name === "Others" ? OTHERS_COLOR : COLORS[i % COLORS.length],
  }));

  return <InteractivePieChart data={slices} label={label} />;
}
