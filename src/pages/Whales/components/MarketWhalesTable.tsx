import { useHistory } from "react-router-dom";

import { useMarketWhales } from "domain/synthetics/whales/marketWhales";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { buildWhaleAccountUrl } from "../whaleRoutes";

export function MarketWhalesTable({ market, window }: { market: string; window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const { rows, totalVolume, isLoading } = useMarketWhales(chainId, market, window, 25);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-body-medium text-typography-secondary">Total volume: {formatUsd(totalVolume)}</div>
      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>#</TableTh>
            <TableTh>Address</TableTh>
            <TableTh>Volume</TableTh>
            <TableTh>Share</TableTh>
            <TableTh>Peak size</TableTh>
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
                <TableTd>{formatUsd(r.volume)}</TableTd>
                <TableTd>{formatPercentage(r.shareBps, { bps: true, displayDecimals: 1 })}</TableTd>
                <TableTd>{formatUsd(r.peakSize)}</TableTd>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
