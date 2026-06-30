import { useHistory } from "react-router-dom";

import { useMarketHolders } from "domain/synthetics/whales/marketConcentration";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { computeShareBps } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTd, TableTdActionable, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { MarketHoldersPie } from "./MarketHoldersPie";
import { buildWhaleAccountUrl } from "../whaleRoutes";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalOi, isLoading } = useMarketHolders(chainId, market, window, 25);
  const { data: volumes } = useMarketVolumes(chainId, window);
  const marketVolume = volumes?.[market];

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
            <TableTh>Open size</TableTh>
            <TableTh>OI share</TableTh>
            <TableTh>Traded volume</TableTh>
            <TableTh>Vol share</TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={6}>Loading…</TableTd>
            </tr>
          ) : (
            rows.map((r, i) => (
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
                  {formatPercentage(computeShareBps(r.volume, marketVolume ?? 0n), { bps: true, displayDecimals: 1 })}
                </TableTdActionable>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
