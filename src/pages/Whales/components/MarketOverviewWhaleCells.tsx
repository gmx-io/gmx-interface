import { useMarketWhales } from "domain/synthetics/whales/marketWhales";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatPercentage } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { TableTd } from "components/Table/Table";

export function MarketOverviewWhaleCells({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const { rows, totalVolume } = useMarketWhales(chainId, market, window, 3);
  const top = rows[0];
  const top3Volume = rows.reduce((acc, r) => acc + r.volume, 0n);
  return (
    <>
      <TableTd>{top ? <AddressView address={top.account} size={20} noLink /> : "—"}</TableTd>
      <TableTd>{top ? formatPercentage(top.shareBps, { bps: true, displayDecimals: 1 }) : "—"}</TableTd>
      <TableTd>
        {formatPercentage(computeShareBps(top3Volume, totalVolume ?? 0n), { bps: true, displayDecimals: 1 })}
      </TableTd>
    </>
  );
}
