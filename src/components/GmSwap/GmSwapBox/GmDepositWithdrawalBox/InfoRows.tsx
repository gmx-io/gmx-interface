import { t, Trans } from "@lingui/macro";
import { useState } from "react";

import { GmSwapFees } from "domain/synthetics/trade";
import { formatDeltaUsd } from "lib/numbers";

import { ExpandableRow } from "components/ExpandableRow";
import { GmFees } from "components/GmSwap/GmFees/GmFees";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { UsdValueWithSkeleton } from "components/UsdValueWithSkeleton/UsdValueWithSkeleton";

import { Operation } from "../types";

export function InfoRows({
  isDeposit,
  fees,
  isLoading,
}: {
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  isLoading?: boolean;
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
        isLoading={isLoading}
      />

      <ExpandableRow
        title={t`Execution Details`}
        open={isExecutionDetailsOpen}
        onToggle={toggleExecutionDetails}
        contentClassName="flex flex-col gap-12"
      >
        <SyntheticsInfoRow
          label={<Trans>Network Fee</Trans>}
          value={
            isLoading ? (
              <UsdValueWithSkeleton usd={undefined} />
            ) : fees?.logicalNetworkFee?.deltaUsd === undefined ? (
              "..."
            ) : (
              formatDeltaUsd(fees.logicalNetworkFee.deltaUsd)
            )
          }
        />
      </ExpandableRow>
    </div>
  );
}
