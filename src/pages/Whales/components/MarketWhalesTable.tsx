import { useHistory } from "react-router-dom";

import { useMarketHolders } from "domain/synthetics/whales/marketConcentration";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { buildWhaleAccountUrl } from "../whaleRoutes";

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalOi, isLoading } = useMarketHolders(chainId, market, window, 25);
  const { data: volumes } = useMarketVolumes(chainId, window);
  const marketVolume = volumes?.[market];

  return (
    <div className="flex flex-col gap-8">
      <div className="text-body-medium text-typography-secondary">
        Open interest: {formatUsd(totalOi)} · Market volume: {formatUsd(marketVolume)}
      </div>
      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>#</TableTh>
            <TableTh>Address</TableTh>
            <TableTh>Open size</TableTh>
            <TableTh>OI share</TableTh>
            <TableTh>Traded volume</TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>Loading…</TableTd>
            </tr>
          ) : (
            rows.map((r, i) => (
              <TableTrActionable key={r.account} onClick={() => history.push(buildWhaleAccountUrl(r.account))}>
                <TableTd>{i + 1}</TableTd>
                <TableTd>
                  <AddressView address={r.account} size={20} noLink />
                </TableTd>
                <TableTd>{formatUsd(r.size)}</TableTd>
                <TableTd>{formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 })}</TableTd>
                <TableTd>{formatUsd(r.volume)}</TableTd>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
