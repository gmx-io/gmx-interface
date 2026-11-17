import { useCopyToClipboard } from "react-use";

import { buildPieSlices } from "domain/synthetics/whales/pieSlices";
import { helperToast } from "lib/helperToast";

import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";

const COLORS = ["#3D51FF", "#26A17B", "#E5A700", "#C04EC9", "#1FA8C9", "#D0563B", "#8E7DFF", "#5FB878"];
const OTHERS_COLOR = "#6B7280";

// Pie of holders by share of `total`, with sub-5% holders collapsed into "Others".
// Clicking a slice copies that holder's address (`id`).
export function MarketHoldersPie({
  items,
  total,
  label,
}: {
  items: { name: string; value: bigint; id: string }[];
  total: bigint | undefined;
  label: string;
}) {
  const [, copyToClipboard] = useCopyToClipboard();

  const slices = buildPieSlices(items, total ?? 0n).map((slice, i) => ({
    name: slice.name,
    value: slice.value,
    id: slice.id,
    color: slice.name === "Others" ? OTHERS_COLOR : COLORS[i % COLORS.length],
  }));

  return (
    <InteractivePieChart
      data={slices}
      label={label}
      onSliceClick={(slice) => {
        if (!slice.id) return;
        copyToClipboard(slice.id);
        helperToast.success("Address copied to clipboard");
      }}
    />
  );
}
