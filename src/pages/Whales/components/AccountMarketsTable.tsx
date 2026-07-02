import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { formatPercentage } from "lib/numbers";

import { Table, TableTd, TableTheadTr, TableTr } from "components/Table/Table";

import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { WhaleColumnHeader } from "./WhaleColumnHeader";
import { formatWhaleUsd } from "./whaleFormat";

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
          <WhaleColumnHeader title="Market" />
          <WhaleColumnHeader
            title="Total volume"
            tooltip="Market's total traded volume in the selected window"
            sorter={sorterProps("totalVolume")}
          />
          <WhaleColumnHeader
            title="Whale volume"
            tooltip="This account's traded volume in the market over the selected window"
            sorter={sorterProps("whaleVolume")}
          />
          <WhaleColumnHeader
            title="Whale share"
            tooltip="This account's share of the market's total traded volume"
            sorter={sorterProps("share")}
          />
        </TableTheadTr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <TableTr key={r.market}>
            <TableTd>{marketsInfoData?.[r.market]?.name ?? r.market}</TableTd>
            <TableTd>{formatWhaleUsd(r.totalVolume)}</TableTd>
            <TableTd>{formatWhaleUsd(r.whaleVolume)}</TableTd>
            <TableTd>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTd>
          </TableTr>
        ))}
        <TableTr>
          <TableTd>All</TableTd>
          <TableTd>{formatWhaleUsd(totalMarket)}</TableTd>
          <TableTd>{formatWhaleUsd(totalWhale)}</TableTd>
          <TableTd>
            {formatPercentage(computeShareBps(totalWhale, totalMarket), { bps: true, displayDecimals: 1 })}
          </TableTd>
        </TableTr>
      </tbody>
    </Table>
  );
}
