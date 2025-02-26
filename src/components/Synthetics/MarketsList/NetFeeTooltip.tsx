import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMedia } from "react-use";

import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { formatRatePercentage } from "lib/numbers";

export function NetFeeTooltip({ marketStats }: { marketStats: MarketStat[] }) {
  const isMobile = useMedia("(max-width: 800px)");

  if (isMobile) {
    return (
      <div className="flex flex-col gap-16">
        {marketStats.map((stat) => {
          const { marketInfo: market, netFeeLong, netFeeShort } = stat;
          return (
            <div key={market.marketTokenAddress} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start text-white">
                <span>{getMarketIndexName(market)}</span>
                <span className="subtext leading-1">[{getMarketPoolName(market)}]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-100">
                  <Trans>Longs Net Rate / 1h</Trans>
                </span>
                <span
                  className={cx({
                    "text-green-500": netFeeLong > 0n,
                    "text-red-500": netFeeLong < 0n,
                  })}
                >
                  {formatRatePercentage(netFeeLong)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-100">
                  <Trans>Shorts Net Rate / 1h</Trans>
                </span>
                <span
                  className={cx({
                    "text-green-500": netFeeShort > 0n,
                    "text-red-500": netFeeShort < 0n,
                  })}
                >
                  {formatRatePercentage(netFeeShort)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="pb-10 font-normal uppercase text-slate-100">
            <Trans>Pool</Trans>
          </th>
          <th className="pb-10 pr-10 text-right font-normal uppercase text-slate-100">
            <Trans>Longs Net Rate / 1h</Trans>
          </th>
          <th className="pb-10  text-right font-normal uppercase text-slate-100">
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
                className={cx("pr-10 text-right", {
                  "text-green-500": netFeeLong > 0n,
                  "text-red-500": netFeeLong < 0n,
                })}
              >
                {formatRatePercentage(netFeeLong)}
              </td>
              <td
                className={cx("text-right", {
                  "text-green-500": netFeeShort > 0n,
                  "text-red-500": netFeeShort < 0n,
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
