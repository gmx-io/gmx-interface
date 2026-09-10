import cx from "classnames";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";

import TooltipComponent from "components/Tooltip/Tooltip";

import ChainsStatsTooltipRow from "./ChainsStatsTooltipRow";
import { summarizeChainsStats, type ChainsStatsEntries } from "./summarizeChainsStats";

type Props = {
  entries: ChainsStatsEntries;
  staleTitles?: string[];
  caption?: ReactNode;
  subtotal?: ReactNode;
  showDollar?: boolean;
  decimalsForConversion?: number;
};

// the figure and its breakdown are drawn from one summary, so they cannot disagree about the total
export default function ChainsStatsTooltip({
  entries,
  staleTitles,
  caption,
  subtotal,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
}: Props) {
  const summary = summarizeChainsStats(entries);

  return (
    <TooltipComponent
      position="bottom-end"
      className={caption ? undefined : "whitespace-nowrap"}
      handle={formatAmountHuman(summary.total, decimalsForConversion, showDollar, 2)}
      handleClassName={cx("numbers", { "text-yellow-300": summary.missingTitles.length > 0 })}
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
            staleTitles={staleTitles}
            subtotal={subtotal}
            showDollar={showDollar}
            decimalsForConversion={decimalsForConversion}
          />
        </>
      }
    />
  );
}
