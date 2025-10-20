import { t } from "@lingui/macro";
import { useMemo } from "react";

import { FeeItem } from "domain/synthetics/fees";
import { WarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { formatPercentage, formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export type Props = {
  priceImpactWarningState: WarningState;
  collateralImpact?: FeeItem;
  positionImpact?: FeeItem;
  swapPriceImpact?: FeeItem;
  externalSwapFeeItem?: FeeItem;
  executionFeeUsd?: bigint;
};

export function HighPriceImpactOrFeesWarningCard({
  priceImpactWarningState,
  collateralImpact,
  positionImpact,
  swapPriceImpact,
  externalSwapFeeItem,
  executionFeeUsd,
}: Props) {
  const warnings = useMemo(() => {
    const warnings: { id: string; key: React.ReactNode; value?: React.ReactNode }[] = [];
    if (priceImpactWarningState.shouldShowWarningForPosition) {
      warnings.push({
        id: "high-price-impact",
        key: t`High price impact`,
        value: formatPercentage(positionImpact?.precisePercentage, { signed: true, bps: false, displayDecimals: 3 }),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      warnings.push({
        id: "high-impact-on-collateral",
        key: t`High impact on collateral`,
        value: formatPercentage(collateralImpact?.precisePercentage, { signed: true, bps: false, displayDecimals: 3 }),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForExecutionFee) {
      warnings.push({
        id: "high-network-fees",
        key: t`High network fees`,
        value: formatUsd(executionFeeUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForTwapNetworkFee) {
      warnings.push({
        id: "high-twap-network-fee",
        key: t`High TWAP network fee`,
        value: formatUsd(executionFeeUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForSwap) {
      warnings.push({
        id: "high-swap-price-impact",
        key: t`High swap price impact`,
        value: formatUsd(swapPriceImpact?.deltaUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForTriggerOrders) {
      warnings.push({
        id: "high-trigger-orders",
        key: t`Existing executable trigger orders`,
      });
    }

    if (externalSwapFeeItem) {
      warnings.push({
        id: "high-external-swap-fee",
        key: t`High external swap impact`,
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
  ]);

  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  return (
    <AlertInfoCard className="h-fit" type="warning" onClose={() => priceImpactWarningState.setIsDismissed(true)}>
      <div className="flex flex-col gap-4">
        {warnings.map((warning) => (
          <div key={warning.id} className="flex justify-between gap-4">
            <div>{warning.key}</div>
            <div className="font-medium text-yellow-300">{warning.value}</div>
          </div>
        ))}
      </div>
    </AlertInfoCard>
  );
}
