import { t } from "@lingui/macro";
import { useState } from "react";

import { ExecutionFee } from "domain/synthetics/fees";
import { GmSwapFees } from "domain/synthetics/trade";

import { ExpandableRow } from "components/ExpandableRow";
import { GmFees } from "components/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/NetworkFeeRow/NetworkFeeRow";

import { Operation } from "../types";

export function InfoRows({
  isDeposit,
  fees,
  executionFee,
}: {
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  executionFee: ExecutionFee | undefined;
}) {
  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);

  const toggleExecutionDetails = () => {
    setIsExecutionDetailsOpen(!isExecutionDetailsOpen);
  };

  return (
    <div className="flex w-full flex-col gap-14 rounded-8 bg-slate-900 p-12">
      <GmFees
        operation={isDeposit ? Operation.Deposit : Operation.Withdrawal}
        totalFees={fees?.totalFees}
        swapFee={fees?.swapFee}
        swapPriceImpact={fees?.swapPriceImpact}
        uiFee={fees?.uiFee}
      />

      <ExpandableRow
        title={t`Execution Details`}
        open={isExecutionDetailsOpen}
        onToggle={toggleExecutionDetails}
        contentClassName="flex flex-col gap-12"
      >
        <NetworkFeeRow rowPadding executionFee={executionFee} />
      </ExpandableRow>
    </div>
  );
}
