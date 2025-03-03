import { t } from "@lingui/macro";
import { useMemo } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { FeeItem } from "domain/synthetics/fees";
import { WarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { formatPercentage, formatUsd } from "lib/numbers";

export type Props = {
  priceImpactWarningState: WarningState;
  collateralImpact?: FeeItem;
  positionImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  externalSwapFeeItem?: FeeItem;
  executionFeeUsd?: bigint;
};

export function HighPriceImpactOrFeesWarningCard({
  priceImpactWarningState,
  collateralImpact,
  positionImpact,
  swapPriceImpact,
  swapProfitFee,
  externalSwapFeeItem,
  executionFeeUsd,
}: Props) {
  const warnings = useMemo(() => {
    const warnings: { id: string; key: React.ReactNode; value?: React.ReactNode }[] = [];
    if (priceImpactWarningState.shouldShowWarningForPosition) {
      warnings.push({
        id: "high-price-impact",
        key: t`High Price Impact`,
        value: formatPercentage(positionImpact?.precisePercentage, { signed: true, bps: false, displayDecimals: 3 }),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      warnings.push({
        id: "high-impact-on-collateral",
        key: t`High Impact on Collateral`,
        value: formatPercentage(collateralImpact?.precisePercentage, { signed: true, bps: false, displayDecimals: 3 }),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForExecutionFee) {
      warnings.push({
        id: "high-network-fees",
        key: t`High Network Fees`,
        value: formatUsd(executionFeeUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForSwap) {
      warnings.push({
        id: "high-swap-price-impact",
        key: t`High Swap Price Impact`,
        value: formatUsd(swapPriceImpact?.deltaUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForSwapProfitFee) {
      warnings.push({
        id: "high-swap-profit-fee",
        key: t`High Swap Profit Fee`,
        value: formatUsd(swapProfitFee?.deltaUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForTriggerOrders) {
      warnings.push({
        id: "high-trigger-orders",
        key: t`Existing Executable Trigger Orders`,
      });
    }

    if (externalSwapFeeItem) {
      warnings.push({
        id: "high-external-swap-fee",
        key: t`High External Swap Impact`,
        value: formatUsd(externalSwapFeeItem.deltaUsd),
      });
    }
    return warnings;
  }, [
    priceImpactWarningState,
    externalSwapFeeItem,
    positionImpact?.precisePercentage,
    collateralImpact?.precisePercentage,
    executionFeeUsd,
    swapPriceImpact?.deltaUsd,
    swapProfitFee?.deltaUsd,
  ]);

  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  return (
    <AlertInfoCard type="warning" onClose={() => priceImpactWarningState.setIsDismissed(true)}>
      <div className="flex flex-col gap-4">
        {warnings.map((warning) => (
          <div key={warning.id} className="flex justify-between">
            <div>{warning.key}</div>
            <div>{warning.value}</div>
          </div>
        ))}
      </div>
    </AlertInfoCard>
  );
}
