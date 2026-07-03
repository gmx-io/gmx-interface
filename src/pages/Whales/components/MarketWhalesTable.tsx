import { useHistory } from "react-router-dom";

import { useMarketHolders } from "domain/synthetics/whales/marketConcentration";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatPercentage } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTdActionable, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { MarketHoldersPie } from "./MarketHoldersPie";
import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { WhaleColumnHeader } from "./WhaleColumnHeader";
import { formatWhaleUsd } from "./whaleFormat";
import { WhalePieSkeleton, WhaleTableSkeleton } from "./WhaleSkeletons";
import { buildWhaleAccountUrl } from "../whaleRoutes";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type DetailField = "size" | "oiShare" | "volume" | "volShare";

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalOi, totalVolume, isLoading } = useMarketHolders(chainId, market, window, 25);
  const { orderBy, direction, sorterProps } = useWhaleSort<DetailField>("volume");

  const decorated = rows.map((r) => ({ ...r, volShareBps: computeShareBps(r.volume, totalVolume ?? 0n) }));
  const sorted = sortByBigint(decorated, direction, (r) =>
    orderBy === "size" ? r.size : orderBy === "oiShare" ? r.oiShareBps : orderBy === "volume" ? r.volume : r.volShareBps
  );

  const loadingEmpty = isLoading && rows.length === 0;

  return (
    <div className="flex flex-col gap-16">
      {(rows.length > 0 || loadingEmpty) && (
        <div className="flex flex-wrap gap-24">
          <div className="flex flex-col items-center gap-4">
            <div className="text-body-small text-typography-secondary">OI concentration</div>
            {rows.length > 0 ? (
              <MarketHoldersPie
                items={rows.map((r) => ({ name: shortAddr(r.account), value: r.size, id: r.account }))}
                total={totalOi}
                label={formatWhaleUsd(totalOi) ?? "—"}
              />
            ) : (
              <WhalePieSkeleton />
            )}
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-body-small text-typography-secondary">Volume concentration</div>
            {rows.length > 0 ? (
              <MarketHoldersPie
                items={rows.map((r) => ({ name: shortAddr(r.account), value: r.volume, id: r.account }))}
                total={totalVolume}
                label={formatWhaleUsd(totalVolume) ?? "—"}
              />
            ) : (
              <WhalePieSkeleton />
            )}
          </div>
        </div>
      )}

      <Table>
        <thead>
          <TableTheadTr>
            <WhaleColumnHeader title="#" />
            <WhaleColumnHeader title="Address" />
            <WhaleColumnHeader
              title="Open size"
              tooltip="Account's current open position size in this market"
              sorter={sorterProps("size")}
            />
            <WhaleColumnHeader
              title="Traded volume"
              tooltip="Account's traded volume in this market over the selected window"
              sorter={sorterProps("volume")}
            />
            <WhaleColumnHeader
              title="OI share"
              tooltip="Account's share of the market's current open interest (by position size)"
              sorter={sorterProps("oiShare")}
            />
            <WhaleColumnHeader
              title="Vol share"
              tooltip="Account's share of the market's total traded volume in the window"
              sorter={sorterProps("volShare")}
            />
          </TableTheadTr>
        </thead>
        <tbody>
          {loadingEmpty ? (
            <WhaleTableSkeleton columns={6} />
          ) : (
            sorted.map((r, i) => (
              <TableTrActionable
                key={r.account}
                className="cursor-pointer"
                onClick={() => history.push(buildWhaleAccountUrl(r.account))}
              >
                <TableTdActionable>{i + 1}</TableTdActionable>
                <TableTdActionable>
                  <AddressView address={r.account} size={20} noLink />
                </TableTdActionable>
                <TableTdActionable>{formatWhaleUsd(r.size)}</TableTdActionable>
                <TableTdActionable>{formatWhaleUsd(r.volume)}</TableTdActionable>
                <TableTdActionable>
                  {formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 })}
                </TableTdActionable>
                <TableTdActionable>
                  {formatPercentage(r.volShareBps, { bps: true, displayDecimals: 1 })}
                </TableTdActionable>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
