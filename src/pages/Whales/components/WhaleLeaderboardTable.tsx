import { Link, useHistory } from "react-router-dom";

import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { windowToFromTimestamp, type WhaleWindow } from "domain/synthetics/whales/period";
import { rankByVolumeDesc } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTd, TableTdActionable, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

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
          <TableTh>Dashboard</TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {isLoading && rows.length === 0 ? (
          <tr>
            <TableTd colSpan={4}>Loading…</TableTd>
          </tr>
        ) : (
          rows.map((acc, i) => (
            <TableTrActionable
              key={acc.account}
              className="cursor-pointer"
              onClick={() => history.push(buildWhaleAccountUrl(acc.account))}
            >
              <TableTdActionable>{i + 1}</TableTdActionable>
              <TableTdActionable>
                <AddressView address={acc.account} size={20} noLink />
              </TableTdActionable>
              <TableTdActionable>{formatUsd(acc.volume)}</TableTdActionable>
              <TableTdActionable>
                <Link
                  to={buildAccountDashboardUrl(acc.account, chainId, 2)}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-300 hover:underline"
                >
                  Open ↗
                </Link>
              </TableTdActionable>
            </TableTrActionable>
          ))
        )}
      </tbody>
    </Table>
  );
}
