import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";
import { formatAmountHuman } from "lib/numbers";

import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";

const COLORS = ["#3D51FF", "#26A17B", "#E5A700", "#C04EC9", "#1FA8C9", "#D0563B", "#8E7DFF", "#5FB878"];

export function AccountMarketsPie({ rows }: { rows: AccountMarketRow[] }) {
  const marketsInfoData = useMarketsInfoData();
  const total = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);
  const data = rows.map((r, i) => ({
    name: marketsInfoData?.[r.market]?.name ?? r.market,
    // value is a display percentage number for the pie/tooltip
    value: total > 0n ? Number((r.whaleVolume * 10000n) / total) / 100 : 0,
    color: COLORS[i % COLORS.length],
  }));
  return <InteractivePieChart data={data} label={formatAmountHuman(total, 30, true, 1)} />;
}
