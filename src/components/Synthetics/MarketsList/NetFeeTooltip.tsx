import { Trans } from "@lingui/macro";
import cx from "classnames";

import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { formatRatePercentage } from "lib/numbers";

import "./NetFeeTooltip.scss";

export function NetFeeTooltip({ marketStats }: { marketStats: MarketStat[] }) {
  return (
    <table className="NetFeeTooltip">
      <thead className="NetFeeTooltip-head">
        <tr>
          <th>
            <Trans>Pool</Trans>
          </th>
          <th className="NetFeeTooltip-cell-center">
            <Trans>Longs Net Rate / 1h</Trans>
          </th>
          <th className="NetFeeTooltip-cell-right">
            <Trans>Shorts Net Rate / 1h</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {marketStats.map((stat) => {
          const { marketInfo: market, netFeeLong, netFeeShort } = stat;

          return (
            <tr key={market.marketTokenAddress}>
              <td>
                <div className="inline-flex flex-wrap items-start text-white">
                  <span>{getMarketIndexName(market)}</span>
                  <span className="subtext leading-1">[{getMarketPoolName(market)}]</span>
                </div>
              </td>
              <td
                className={cx("NetFeeTooltip-cell-center", {
                  "text-green-500": netFeeLong > 0,
                  "text-red-500": netFeeLong < 0,
                })}
              >
                {formatRatePercentage(netFeeLong)}
              </td>
              <td
                className={cx("NetFeeTooltip-cell-right", {
                  "text-green-500": netFeeShort > 0,
                  "text-red-500": netFeeShort < 0,
                })}
              >
                {formatRatePercentage(netFeeShort)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
