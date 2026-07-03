import { useHistory } from "react-router-dom";

import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { windowToFromTimestamp, type WhaleWindow } from "domain/synthetics/whales/period";
import { rankByVolumeDesc } from "domain/synthetics/whales/shares";
import { useChainId } from "lib/chains";

import AddressView from "components/AddressView/AddressView";
import { Table, TableTdActionable, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { WhaleColumnHeader } from "./WhaleColumnHeader";
import { formatWhaleUsd } from "./whaleFormat";
import { WhaleTableSkeleton } from "./WhaleSkeletons";
import { buildWhaleAccountUrl } from "../whaleRoutes";

const TOP_N = 100;

export function WhaleLeaderboardTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const from = windowToFromTimestamp(window, Math.floor(Date.now() / 1000)) ?? 0;
  const { direction, sorterProps } = useWhaleSort<"volume">("volume");

  const { data, isLoading } = useLeaderboardData(true, chainId, {
    account: undefined,
    from,
    to: undefined,
    positionsSnapshotTimestamp: undefined,
    leaderboardDataType: "accounts",
  });

  const top = rankByVolumeDesc(data?.accounts ?? []).slice(0, TOP_N);
  const rows = sortByBigint(top, direction, (r) => r.volume);

  return (
    <Table>
      <thead>
        <TableTheadTr>
          <WhaleColumnHeader title="#" />
          <WhaleColumnHeader title="Address" />
          <WhaleColumnHeader
            title="Total volume"
            tooltip="Account's total traded volume across all markets in the selected window"
            sorter={sorterProps("volume")}
          />
        </TableTheadTr>
      </thead>
      <tbody>
        {isLoading && rows.length === 0 ? (
          <WhaleTableSkeleton columns={3} />
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
              <TableTdActionable>{formatWhaleUsd(acc.volume)}</TableTdActionable>
            </TableTrActionable>
          ))
        )}
      </tbody>
    </Table>
  );
}
