import cx from "classnames";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";

import TooltipComponent from "components/Tooltip/Tooltip";

import ChainsStatsTooltipRow from "./ChainsStatsTooltipRow";
import { summarizeChainsStats, type ChainsStatsEntries, type ChainsStatsStaleEntry } from "./summarizeChainsStats";

type Props = {
  entries: ChainsStatsEntries;
  staleEntries?: ChainsStatsStaleEntry[];
  caption?: ReactNode;
  subtotal?: ReactNode;
  showDollar?: boolean;
  decimalsForConversion?: number;
};

const NO_STALE_ENTRIES: ChainsStatsStaleEntry[] = [];

// the figure and its breakdown are drawn from one summary, so they cannot disagree about the total
export default function ChainsStatsTooltip({
  entries,
  staleEntries = NO_STALE_ENTRIES,
  caption,
  subtotal,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
}: Props) {
  const summary = summarizeChainsStats(entries);
  const isIncomplete = summary.missingTitles.length > 0 || staleEntries.length > 0;

  return (
    <TooltipComponent
      position="bottom-end"
      className={caption ? undefined : "whitespace-nowrap"}
      handle={formatAmountHuman(summary.total, decimalsForConversion, showDollar, 2)}
      handleClassName={cx("numbers", { "text-yellow-300": isIncomplete })}
      content={
        <>
          {caption && (
            <>
              {caption}
              <br />
              <br />
            </>
          )}
          <ChainsStatsTooltipRow
            summary={summary}
            staleEntries={staleEntries}
            subtotal={subtotal}
            showDollar={showDollar}
            decimalsForConversion={decimalsForConversion}
          />
        </>
      }
    />
  );
}
