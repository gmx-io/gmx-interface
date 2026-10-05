import { t, Trans } from "@lingui/macro";
import { useState } from "react";

import { Operation } from "domain/synthetics/markets/types";
import { GmSwapFees } from "domain/synthetics/trade";

import { ExpandableRow } from "components/ExpandableRow";
import { GmFees } from "components/GmSwap/GmFees/GmFees";
import { NetworkFeeValue } from "components/NetworkFeeRow/NetworkFeeValue";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { UsdValueWithSkeleton } from "components/UsdValueWithSkeleton/UsdValueWithSkeleton";

import type { GmNetworkFeeInfo } from "./useGmNetworkFeeDetails";

export function InfoRows({
  isDeposit,
  fees,
  networkFee,
  isLoading,
}: {
  isDeposit: boolean;
  fees: GmSwapFees | undefined;
  networkFee: GmNetworkFeeInfo | undefined;
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
        title={t`Execution details`}
        open={isExecutionDetailsOpen}
        onToggle={toggleExecutionDetails}
        wrapped
        contentClassName="flex flex-col gap-12"
      >
        <SyntheticsInfoRow
          qa="network-fee"
          label={<Trans>Network fee</Trans>}
          value={
            isLoading ? (
              <UsdValueWithSkeleton usd={undefined} />
            ) : networkFee?.details === undefined ? (
              "..."
            ) : (
              <NetworkFeeValue
                amount={networkFee.details.amount}
                usd={networkFee.details.usd}
                decimals={networkFee.details.decimals}
                symbol={networkFee.details.symbol}
                isStable={networkFee.details.isStable}
                source={networkFee.source}
                isExpress={networkFee.isExpress}
              />
            )
          }
        />
      </ExpandableRow>
    </div>
  );
}
