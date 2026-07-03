import { useHistory } from "react-router-dom";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { AccountMarketRow } from "domain/synthetics/whales/accountMarkets";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { formatPercentage } from "lib/numbers";

import { Table, TableTd, TableTdActionable, TableTheadTr, TableTr, TableTrActionable } from "components/Table/Table";

import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { WhaleColumnHeader } from "./WhaleColumnHeader";
import { formatWhaleUsd } from "./whaleFormat";
import { WhaleTableSkeleton } from "./WhaleSkeletons";
import { buildWhaleMarketUrl } from "../whaleRoutes";

type AccountField = "whaleVolume" | "volShare" | "whaleOi" | "oiShare";

export function AccountMarketsTable({ rows, isLoading }: { rows: AccountMarketRow[]; isLoading?: boolean }) {
  const marketsInfoData = useMarketsInfoData();
  const history = useHistory();
  const { orderBy, direction, sorterProps } = useWhaleSort<AccountField>("whaleVolume");

  const totalVolume = rows.reduce((acc, r) => acc + r.totalVolume, 0n);
  const totalWhaleVolume = rows.reduce((acc, r) => acc + r.whaleVolume, 0n);
  const totalOi = rows.reduce((acc, r) => acc + r.totalOi, 0n);
  const totalWhaleOi = rows.reduce((acc, r) => acc + r.whaleOi, 0n);

  const sorted = sortByBigint(rows, direction, (r) =>
    orderBy === "whaleVolume"
      ? r.whaleVolume
      : orderBy === "volShare"
        ? r.shareBps
        : orderBy === "whaleOi"
          ? r.whaleOi
          : r.oiShareBps
  );

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <WhaleColumnHeader title="Market" />
          <WhaleColumnHeader
            title="Whale volume"
            tooltip="This account's traded volume in the market over the selected window"
            sorter={sorterProps("whaleVolume")}
          />
          <WhaleColumnHeader
            title="Volume whale share"
            tooltip="This account's share of the market's total traded volume"
            sorter={sorterProps("volShare")}
          />
          <WhaleColumnHeader
            title="Whale OI"
            tooltip="This account's current open position size in the market"
            sorter={sorterProps("whaleOi")}
          />
          <WhaleColumnHeader
            title="Whale OI share"
            tooltip="This account's share of the market's current open interest"
            sorter={sorterProps("oiShare")}
          />
        </TableTheadTr>
      </thead>
      <tbody>
        {isLoading && rows.length === 0 ? (
          <WhaleTableSkeleton columns={5} />
        ) : (
          <>
            {sorted.map((r) => (
              <TableTrActionable
                key={r.market}
                className="cursor-pointer"
                onClick={() => history.push(buildWhaleMarketUrl(r.market))}
              >
                <TableTdActionable>{marketsInfoData?.[r.market]?.name ?? r.market}</TableTdActionable>
                <TableTdActionable>{formatWhaleUsd(r.whaleVolume)}</TableTdActionable>
                <TableTdActionable>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTdActionable>
                <TableTdActionable>{formatWhaleUsd(r.whaleOi)}</TableTdActionable>
                <TableTdActionable>
                  {formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 })}
                </TableTdActionable>
              </TableTrActionable>
            ))}
            <TableTr>
              <TableTd>All</TableTd>
              <TableTd>{formatWhaleUsd(totalWhaleVolume)}</TableTd>
              <TableTd>
                {formatPercentage(computeShareBps(totalWhaleVolume, totalVolume), { bps: true, displayDecimals: 1 })}
              </TableTd>
              <TableTd>{formatWhaleUsd(totalWhaleOi)}</TableTd>
              <TableTd>
                {formatPercentage(computeShareBps(totalWhaleOi, totalOi), { bps: true, displayDecimals: 1 })}
              </TableTd>
            </TableTr>
          </>
        )}
      </tbody>
    </Table>
  );
}
