import { Trans } from "@lingui/macro";

import { formatAmount } from "lib/numbers";

import { GtMetric, ProgressLine } from "../GtMetric";
import { formatGtPrice } from "../gtPointsFormat";
import { GT_CYCLE_SIZE, GT_DECIMALS, type GtPointsGlobalData } from "../gtPointsTypes";

export function GlobalStats({ global, isLoading }: { global: GtPointsGlobalData | undefined; isLoading: boolean }) {
  const isUnavailable = !isLoading && !global;
  const percent = global ? Number((global.cycleMinted * 10_000n) / GT_CYCLE_SIZE) / 100 : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-32 gap-y-20 rounded-8 bg-slate-900 p-20 max-lg:grid-cols-2 max-md:grid-cols-1">
      <div className="flex min-w-0 flex-col gap-8 max-lg:col-span-2 max-md:col-span-1">
        <GtMetric
          label={global ? <Trans>Cycle {global.cycle}</Trans> : <Trans>Current cycle</Trans>}
          tooltip={
            <Trans>GT is minted in cycles of 210,000 GT. Each new cycle raises the minting price by 2.1%.</Trans>
          }
          isLoading={isLoading}
          value={
            global ? (
              <span>
                {formatAmount(global.cycleMinted, GT_DECIMALS, 0, true)}
                <span className="text-typography-secondary">
                  {" "}
                  / {formatAmount(GT_CYCLE_SIZE, GT_DECIMALS, 0, true)} GT
                </span>
              </span>
            ) : (
              "N/A"
            )
          }
        />
        {global ? (
          <div className="flex items-center gap-12">
            <ProgressLine percent={percent} />
            <span className="text-body-small shrink-0 font-medium text-typography-secondary numbers">
              {percent.toFixed(0)}%
            </span>
          </div>
        ) : null}
      </div>

      <GtMetric
        label={<Trans>Current minting price</Trans>}
        tooltip={<Trans>Price of newly minted GT in this cycle. It is also the highest possible buyback price.</Trans>}
        isLoading={isLoading}
        value={global ? formatGtPrice(global.mintingPriceUsd) : isUnavailable ? "N/A" : null}
      />

      <GtMetric
        label={<Trans>Total GT minted</Trans>}
        tooltip={<Trans>All GT minted since launch.</Trans>}
        isLoading={isLoading}
        value={global ? `${formatAmount(global.totalMinted, GT_DECIMALS, 0, true)} GT` : isUnavailable ? "N/A" : null}
      />
    </div>
  );
}
