import { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketsConcentration } from "domain/synthetics/whales/marketConcentration";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { formatPercentage } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import SearchInput from "components/SearchInput/SearchInput";
import { Table, TableTd, TableTdActionable, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { sortByBigint, useWhaleSort } from "./useWhaleSort";
import { WhaleColumnHeader } from "./WhaleColumnHeader";
import { formatWhaleUsd } from "./whaleFormat";
import { WhaleCellSkeleton, WhaleLongWindowHint, WhaleTableSkeleton } from "./WhaleSkeletons";
import { buildWhaleMarketUrl } from "../whaleRoutes";

type OverviewField = "volume" | "oiShare" | "top3";

export function MarketsOverviewTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const marketsInfoData = useMarketsInfoData();
  const { data: volumes, isLoading } = useMarketVolumes(chainId, window);
  const [search, setSearch] = useState("");
  const { orderBy, direction, sorterProps } = useWhaleSort<OverviewField>("volume");

  const marketAddresses = useMemo(() => Object.keys(volumes ?? {}).sort(), [volumes]);
  const { data: concentration } = useMarketsConcentration(chainId, marketAddresses);

  const rows = marketAddresses.map((market) => {
    const conc = concentration?.[market];
    return {
      market,
      name: marketsInfoData?.[market]?.name ?? market,
      volume: volumes?.[market] ?? 0n,
      topHolder: conc?.topHolder,
      oiShareBps: conc?.topShareBps ?? 0n,
      top3ShareBps: conc?.top3ShareBps ?? 0n,
    };
  });

  const filtered = search ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : rows;
  const sorted = sortByBigint(filtered, direction, (r) =>
    orderBy === "volume" ? r.volume : orderBy === "oiShare" ? r.oiShareBps : r.top3ShareBps
  );

  return (
    <>
      <SearchInput value={search} setValue={setSearch} placeholder="Search market" className="mb-8 max-w-[260px]" />
      {isLoading && rows.length === 0 && <WhaleLongWindowHint window={window} />}
      <Table>
        <thead>
          <TableTheadTr>
            <WhaleColumnHeader title="Market" />
            <WhaleColumnHeader
              title="Total volume"
              tooltip="Market's total traded volume in the selected window"
              sorter={sorterProps("volume")}
            />
            <WhaleColumnHeader
              title="Top holder"
              tooltip="Account with the largest current open position in this market"
            />
            <WhaleColumnHeader
              title="OI share"
              tooltip="Top holder's share of the market's current open interest"
              sorter={sorterProps("oiShare")}
            />
            <WhaleColumnHeader
              title="Top-3 OI"
              tooltip="Combined open-interest share of the 3 largest holders"
              sorter={sorterProps("top3")}
            />
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <WhaleTableSkeleton columns={5} />
          ) : sorted.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>No markets</TableTd>
            </tr>
          ) : (
            sorted.map((r) => (
              <TableTrActionable
                key={r.market}
                className="cursor-pointer"
                onClick={() => history.push(buildWhaleMarketUrl(r.market))}
              >
                <TableTdActionable>{r.name}</TableTdActionable>
                <TableTdActionable>{formatWhaleUsd(r.volume)}</TableTdActionable>
                <TableTdActionable>
                  {!concentration ? (
                    <WhaleCellSkeleton width={90} />
                  ) : r.topHolder ? (
                    <AddressView address={r.topHolder} size={20} noLink />
                  ) : (
                    "—"
                  )}
                </TableTdActionable>
                <TableTdActionable>
                  {!concentration ? (
                    <WhaleCellSkeleton />
                  ) : r.topHolder ? (
                    formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 })
                  ) : (
                    "—"
                  )}
                </TableTdActionable>
                <TableTdActionable>
                  {!concentration ? (
                    <WhaleCellSkeleton />
                  ) : r.topHolder ? (
                    formatPercentage(r.top3ShareBps, { bps: true, displayDecimals: 1 })
                  ) : (
                    "—"
                  )}
                </TableTdActionable>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
