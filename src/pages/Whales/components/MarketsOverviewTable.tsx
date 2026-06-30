import { useState } from "react";
import { useHistory } from "react-router-dom";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketVolumes } from "domain/synthetics/whales/marketVolumes";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import SearchInput from "components/SearchInput/SearchInput";
import { Table, TableTd, TableTh, TableTheadTr, TableTrActionable } from "components/Table/Table";

import { buildWhaleMarketUrl } from "../whaleRoutes";
import { MarketOverviewWhaleCells } from "./MarketOverviewWhaleCells";

export function MarketsOverviewTable({ window }: { window: WhaleWindow }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const marketsInfoData = useMarketsInfoData();
  const { data: volumes, isLoading } = useMarketVolumes(chainId, window);
  const [search, setSearch] = useState("");

  const rows = Object.entries(volumes ?? {})
    .map(([market, volume]) => ({
      market,
      volume,
      name: marketsInfoData?.[market]?.name ?? market,
    }))
    .sort((a, b) => (a.volume < b.volume ? 1 : a.volume > b.volume ? -1 : 0));

  const filteredRows = search ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : rows;

  return (
    <>
      <SearchInput value={search} setValue={setSearch} placeholder="Search market" className="mb-8 max-w-[260px]" />
      <Table>
        <thead>
          <TableTheadTr>
            <TableTh>Market</TableTh>
            <TableTh>Total volume</TableTh>
            <TableTh>Top holder</TableTh>
            <TableTh>OI share</TableTh>
            <TableTh>Top-3 OI</TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>Loading…</TableTd>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <TableTd colSpan={5}>No markets</TableTd>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <TableTrActionable key={r.market} onClick={() => history.push(buildWhaleMarketUrl(r.market))}>
                <TableTd>{r.name}</TableTd>
                <TableTd>{formatUsd(r.volume)}</TableTd>
                <MarketOverviewWhaleCells market={r.market} />
              </TableTrActionable>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
