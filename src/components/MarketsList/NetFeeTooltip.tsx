import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { formatRatePercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { TooltipTable, TooltipTableColumn } from "components/Tooltip/TooltipBlocks";

const NET_RATE_COLUMNS: TooltipTableColumn[] = [
  { label: <Trans>Pool</Trans> },
  { label: <Trans>Longs / 1h</Trans>, align: "right" },
  { label: <Trans>Shorts / 1h</Trans>, align: "right" },
];

export function NetFeeTooltip({ marketStats }: { marketStats: MarketStat[] }) {
  const rows = useMemo(
    () =>
      marketStats.map(({ marketInfo: market, netFeeLong, netFeeShort }) => [
        <div key="market" className="inline-flex flex-wrap items-start">
          <span>{getMarketIndexName(market)}</span>
          <span className="subtext leading-1">[{getMarketPoolName(market)}]</span>
        </div>,
        <span key="long" className={getPositiveOrNegativeClass(netFeeLong)}>
          {formatRatePercentage(netFeeLong)}
        </span>,
        <span key="short" className={getPositiveOrNegativeClass(netFeeShort)}>
          {formatRatePercentage(netFeeShort)}
        </span>,
      ]),
    [marketStats]
  );

  return <TooltipTable columns={NET_RATE_COLUMNS} rows={rows} />;
}
