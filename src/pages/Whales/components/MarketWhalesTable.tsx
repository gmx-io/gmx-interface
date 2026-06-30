import { useHistory } from "react-router-dom";

import { useMarketHolders } from "domain/synthetics/whales/marketConcentration";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTdActionable, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { MarketHoldersPie } from "./MarketHoldersPie";
import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { buildWhaleAccountUrl } from "../whaleRoutes";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type DetailField = "size" | "oiShare" | "volume" | "volShare";

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalOi, isLoading } = useMarketHolders(chainId, market, window, 25);
  const { data: volumes } = useMarketVolumes(chainId, window);
  const marketVolume = volumes?.[market];
  const { orderBy, direction, sorterProps } = useWhaleSort<DetailField>("size");

  const decorated = rows.map((r) => ({ ...r, volShareBps: computeShareBps(r.volume, marketVolume ?? 0n) }));
  const sorted = sortByBigint(decorated, direction, (r) =>
    orderBy === "size" ? r.size : orderBy === "oiShare" ? r.oiShareBps : orderBy === "volume" ? r.volume : r.volShareBps
  );

  return (
    <div className="flex flex-col gap-16">
      <div className="text-body-medium text-typography-secondary">
        Open interest: {formatUsd(totalOi)} · Market volume: {formatUsd(marketVolume)}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-24">
          <div className="flex flex-col items-center gap-4">
            <div className="text-body-small text-typography-secondary">OI concentration</div>
            <MarketHoldersPie
              items={rows.map((r) => ({ name: shortAddr(r.account), value: r.size }))}
              total={totalOi}
              label={formatUsd(totalOi) ?? "—"}
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-body-small text-typography-secondary">Volume concentration</div>
            <MarketHoldersPie
              items={rows.map((r) => ({ name: shortAddr(r.account), value: r.volume }))}
              total={marketVolume}
              label={formatUsd(marketVolume) ?? "—"}
            />
          </div>
        </div>
      )}

      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>#</TableTh>
            <TableTh>Address</TableTh>
            <TableTh>
              <Sorter {...sorterProps("size")}>Open size</Sorter>
            </TableTh>
            <TableTh>
              <Sorter {...sorterProps("oiShare")}>OI share</Sorter>
            </TableTh>
            <TableTh>
              <Sorter {...sorterProps("volume")}>Traded volume</Sorter>
            </TableTh>
            <TableTh>
              <Sorter {...sorterProps("volShare")}>Vol share</Sorter>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={6}>Loading…</TableTd>
            </tr>
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
                <TableTdActionable>{formatUsd(r.size)}</TableTdActionable>
                <TableTdActionable>
                  {formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 })}
                </TableTdActionable>
                <TableTdActionable>{formatUsd(r.volume)}</TableTdActionable>
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
