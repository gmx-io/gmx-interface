import { useHistory } from "react-router-dom";

import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { windowToFromTimestamp, type WhaleWindow } from "domain/synthetics/whales/period";
import { rankByVolumeDesc } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { buildWhaleAccountUrl } from "../whaleRoutes";

const TOP_N = 100;

export function WhaleLeaderboardTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const from = windowToFromTimestamp(window, Math.floor(Date.now() / 1000)) ?? 0;

  const { data, isLoading } = useLeaderboardData(true, chainId, {
    account: undefined,
    from,
    to: undefined,
    positionsSnapshotTimestamp: undefined,
    leaderboardDataType: "accounts",
  });

  const rows = rankByVolumeDesc(data?.accounts ?? []).slice(0, TOP_N);

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <TableTh>#</TableTh>
          <TableTh>Address</TableTh>
          <TableTh>Total volume</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {isLoading && rows.length === 0 ? (
          <tr>
            <TableTd colSpan={3}>Loading…</TableTd>
          </tr>
        ) : (
          rows.map((acc, i) => (
            <TableTrActionable key={acc.account} onClick={() => history.push(buildWhaleAccountUrl(acc.account))}>
              <TableTd>{i + 1}</TableTd>
              <TableTd>
                <AddressView address={acc.account} size={20} noLink />
              </TableTd>
              <TableTd>{formatUsd(acc.volume)}</TableTd>
            </TableTrActionable>
          ))
        )}
      </tbody>
    </Table>
  );
}
