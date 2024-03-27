import { Trans } from "@lingui/macro";
import { getMarketPoolName, getMarketIndexName } from "domain/synthetics/markets";
import { formatRatePercentage } from "lib/numbers";
import { MarketStat } from "./MarketsList";

import "./NetFeeTooltip.scss";

export function NetFeeTooltip({ marketStats }: { marketStats: MarketStat[] }) {
  return (
    <table className="NetFeeTooltip">
      <thead className="NetFeeTooltip-head">
        <tr>
          <th>
            <Trans>Pool</Trans>
          </th>
          <th className="NetFeeTooltip-cell-right">
            <Trans>Longs Net Fee / 1h</Trans>
          </th>
          <th className="NetFeeTooltip-cell-right">
            <Trans>Shorts Net Fee / 1h</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {marketStats.map((stat) => {
          const { marketInfo: market, netFeeLong, netFeeShort } = stat;

          return (
            <tr key={market.marketTokenAddress}>
              <td>
                <div className="items-top flex-wrap text-white">
                  <span>{getMarketIndexName(market)}</span>
                  <span className="subtext lh-1">[{getMarketPoolName(market)}]</span>
                </div>
              </td>
              <td className="NetFeeTooltip-cell-right">{formatRatePercentage(netFeeLong)}</td>
              <td className="NetFeeTooltip-cell-right">{formatRatePercentage(netFeeShort)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
