import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";

export type Props = {
  priceImpactWarinigState: PriceImpactWarningState;
  className?: string;
};

export function HighPriceImpactWarning({ priceImpactWarinigState, className }: Props) {
  if (!priceImpactWarinigState.shouldShowWarning) {
    return null;
  }

  const shouldShowSwapImpact = priceImpactWarinigState.shouldShowWarningForSwap;
  const shouldShowPriceImpact = priceImpactWarinigState.shouldShowWarningForPosition;

  return (
    <div className={className}>
      {shouldShowPriceImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarinigState.isHighPositionImpactAccepted}
          setIsChecked={priceImpactWarinigState.setIsHighPositionImpactAccepted}
        >
          <span className="text-14 text-yellow-500">
            <Trans>Acknowledge high Price Impact</Trans>
          </span>
        </Checkbox>
      )}

      {shouldShowSwapImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarinigState.isHighSwapImpactAccepted}
          setIsChecked={priceImpactWarinigState.setIsHighSwapImpactAccepted}
        >
          <span className="text-14 text-yellow-500">
            <Trans>Acknowledge high Swap Price Impact</Trans>
          </span>
        </Checkbox>
      )}
    </div>
  );
}
