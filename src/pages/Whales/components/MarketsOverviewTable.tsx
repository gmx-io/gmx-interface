import { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketsConcentration } from "domain/synthetics/whales/marketConcentration";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { formatPercentage, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTdActionable, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { buildWhaleMarketUrl } from "../whaleRoutes";
import { sortByBigint, useWhaleSort } from "./useWhaleSort";

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
      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>Market</TableTh>
            <TableTh>
              <Sorter {...sorterProps("volume")}>Total volume</Sorter>
            </TableTh>
            <TableTh>Top holder</TableTh>
            <TableTh>
              <Sorter {...sorterProps("oiShare")}>OI share</Sorter>
            </TableTh>
            <TableTh>
              <Sorter {...sorterProps("top3")}>Top-3 OI</Sorter>
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>Loading…</TableTd>
            </tr>
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
                <TableTdActionable>{formatUsd(r.volume)}</TableTdActionable>
                <TableTdActionable>
                  {r.topHolder ? <AddressView address={r.topHolder} size={20} noLink /> : "—"}
                </TableTdActionable>
                <TableTdActionable>
                  {r.topHolder ? formatPercentage(r.oiShareBps, { bps: true, displayDecimals: 1 }) : "—"}
                </TableTdActionable>
                <TableTdActionable>
                  {r.topHolder ? formatPercentage(r.top3ShareBps, { bps: true, displayDecimals: 1 }) : "—"}
                </TableTdActionable>
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
