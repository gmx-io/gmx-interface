import { t, Trans } from "@lingui/macro";
import { ReactNode, useState } from "react";

import { Operation } from "domain/synthetics/markets/types";
import { formatDeltaUsd } from "lib/numbers";

import { ExpandableRow } from "components/ExpandableRow";
import { GmFees } from "components/GmSwap/GmFees/GmFees";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { UsdValueWithSkeleton } from "components/UsdValueWithSkeleton/UsdValueWithSkeleton";

import type { GmLogicalFees } from "./useDepositWithdrawalFees";

export function InfoRows({
  isDeposit,
  fees,
  isLoading,
  executionDetails,
}: {
  isDeposit: boolean;
  fees: GmLogicalFees | undefined;
  isLoading?: boolean;
  executionDetails?: ReactNode;
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
        collateralSwapFee={fees?.collateralSwapFee}
        transitFee={fees?.transitFee}
        swapPriceImpact={fees?.swapPriceImpact}
        uiFee={fees?.uiFee}
        isLoading={isLoading}
      />

      <ExpandableRow
        title={t`Execution details`}
        open={isExecutionDetailsOpen}
        onToggle={toggleExecutionDetails}
        wrapped
        contentClassName="flex flex-col gap-12"
      >
        <SyntheticsInfoRow
          label={<Trans>Network fee</Trans>}
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
        {executionDetails}
      </ExpandableRow>
    </div>
  );
}
