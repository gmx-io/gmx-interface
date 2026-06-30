import { useMarketConcentration } from "domain/synthetics/whales/marketConcentration";
import { useChainId } from "lib/chains";
import { formatPercentage } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { TableTdActionable } from "components/Table/Table";

// Cheap, window-independent concentration (top holder + size shares of current
// open interest) — one query per market. Exact cumulative volume share lives on
// the market detail and account pages.
export function MarketOverviewWhaleCells({ market }: { market: string }) {
  const { chainId } = useChainId();
  const { data } = useMarketConcentration(chainId, market);
  const topHolder = data?.topHolder;
  return (
    <>
      <TableTdActionable>{topHolder ? <AddressView address={topHolder} size={20} noLink /> : "—"}</TableTdActionable>
      <TableTdActionable>
        {data ? formatPercentage(data.topShareBps, { bps: true, displayDecimals: 1 }) : "—"}
      </TableTdActionable>
      <TableTdActionable>
        {data ? formatPercentage(data.top3ShareBps, { bps: true, displayDecimals: 1 }) : "—"}
      </TableTdActionable>
    </>
  );
}
