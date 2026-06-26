import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { formatPercentage, formatUsd } from "lib/numbers";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

export function AccountMarketsTable({ rows }: { rows: AccountMarketRow[] }) {
  const marketsInfoData = useMarketsInfoData();
  const totalMarket = rows.reduce((acc, r) => acc + r.totalVolume, 0n);
  const totalWhale = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>Market</TableTh>
          <TableTh>Total volume</TableTh>
          <TableTh>Whale volume</TableTh>
          <TableTh>Whale share</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <TableTr key={r.market}>
            <TableTd>{marketsInfoData?.[r.market]?.name ?? r.market}</TableTd>
            <TableTd>{formatUsd(r.totalVolume)}</TableTd>
            <TableTd>{formatUsd(r.whaleVolume)}</TableTd>
            <TableTd>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTd>
          </TableTr>
        ))}
        <TableTr>
          <TableTd>All</TableTd>
          <TableTd>{formatUsd(totalMarket)}</TableTd>
          <TableTd>{formatUsd(totalWhale)}</TableTd>
          <TableTd>
            {formatPercentage(computeShareBps(totalWhale, totalMarket), { bps: true, displayDecimals: 1 })}
          </TableTd>
        </TableTr>
      </tbody>
    </Table>
  );
}
