import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { formatPercentage, formatUsd } from "lib/numbers";

import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import { sortByBigint, useWhaleSort } from "./useWhaleSort";

type AccountField = "totalVolume" | "whaleVolume" | "share";

export function AccountMarketsTable({ rows }: { rows: AccountMarketRow[] }) {
  const marketsInfoData = useMarketsInfoData();
  const { orderBy, direction, sorterProps } = useWhaleSort<AccountField>("whaleVolume");

  const totalMarket = rows.reduce((acc, r) => acc + r.totalVolume, 0n);
  const totalWhale = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);

  const sorted = sortByBigint(rows, direction, (r) =>
    orderBy === "totalVolume" ? r.totalVolume : orderBy === "whaleVolume" ? r.whaleVolume : r.shareBps
  );

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>Market</TableTh>
          <TableTh>
            <Sorter {...sorterProps("totalVolume")}>Total volume</Sorter>
          </TableTh>
          <TableTh>
            <Sorter {...sorterProps("whaleVolume")}>Whale volume</Sorter>
          </TableTh>
          <TableTh>
            <Sorter {...sorterProps("share")}>Whale share</Sorter>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {sorted.map((r) => (
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
