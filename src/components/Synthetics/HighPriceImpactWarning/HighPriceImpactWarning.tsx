import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";

export type Props = {
  priceImpactWarningState: PriceImpactWarningState;
  className?: string;
};

export function HighPriceImpactWarning({ priceImpactWarningState, className }: Props) {
  const warnings = useMemo(() => {
    const warnings: string[] = [];
    if (priceImpactWarningState.shouldShowWarningForPosition) {
      warnings.push(t`price impact`);
    }

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      warnings.push(t`impact on collateral`);
    }

    if (priceImpactWarningState.shouldShowWarningForSwap) {
      warnings.push(t`swap price impact`);
    }

    if (priceImpactWarningState.shouldShowWarningForSwapProfitFee) {
      warnings.push(t`swap profit fee`);
    }

    if (priceImpactWarningState.shouldShowWarningForExecutionFee) {
      warnings.push(t`network fees`);
    }

    return warnings;
  }, [
    priceImpactWarningState.shouldShowWarningForCollateral,
    priceImpactWarningState.shouldShowWarningForExecutionFee,
    priceImpactWarningState.shouldShowWarningForPosition,
    priceImpactWarningState.shouldShowWarningForSwap,
    priceImpactWarningState.shouldShowWarningForSwapProfitFee,
  ]);

  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  return (
    <div className={className}>
      <Checkbox
        asRow
        isChecked={priceImpactWarningState.isAccepted}
        setIsChecked={priceImpactWarningState.setIsAccepted}
        qa="high-price-impact-warning"
      >
        <span className="text-body-medium text-yellow-500">
          {warnings.length > 1 ? (
            <Trans>
              Acknowledge high {warnings.slice(0, -1).join(", ")} and {warnings.slice(-1)}
            </Trans>
          ) : (
            <Trans>Acknowledge high {warnings[0]}</Trans>
          )}
        </span>
      </Checkbox>
    </div>
  );
}
