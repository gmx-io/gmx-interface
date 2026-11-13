import { Trans } from "@lingui/macro";

import { USD_DECIMALS } from "config/factors";

import { AmountHumanValue } from "components/NumericValue/AmountHumanValue";
import { TooltipRow, TooltipRows, TooltipTotal } from "components/Tooltip/TooltipBlocks";

import { ChainsStatsNotices } from "./ChainsStatsNotices";
import type { ChainsStatsStaleEntry, ChainsStatsSummary } from "./summarizeChainsStats";

type Props = {
  summary: ChainsStatsSummary;
  showDollar?: boolean;
  decimalsForConversion?: number;
  staleEntries: ChainsStatsStaleEntry[];
};

export default function ChainsStatsTooltipRow({
  summary: { knownEntries, missingTitles, total },
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  staleEntries,
}: Props) {
  if (knownEntries.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipRows>
        {knownEntries.map(([title, value]) => (
          <TooltipRow
            key={title}
            label={<Trans>{title}</Trans>}
            value={
              <AmountHumanValue
                amount={value}
                decimals={decimalsForConversion}
                showDollar={showDollar}
                displayDecimals={2}
              />
            }
          />
        ))}
        <TooltipTotal
          label={<Trans>Total</Trans>}
          value={
            <AmountHumanValue
              amount={total}
              decimals={decimalsForConversion}
              showDollar={showDollar}
              displayDecimals={2}
            />
          }
        />
      </TooltipRows>
      <ChainsStatsNotices missingTitles={missingTitles} staleEntries={staleEntries} className="text-yellow-300" />
    </>
  );
}
