import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";

export type Props = {
  priceImpactWarinigState: PriceImpactWarningState;
  className?: string;
};

export function HighPriceImpactWarning({ priceImpactWarinigState, className }: Props) {
  if (!priceImpactWarinigState.isHighPositionImpact && !priceImpactWarinigState.isHighSwapImpact) {
    return null;
  }

  return (
    <div className={className}>
      {priceImpactWarinigState.isHighPositionImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarinigState.isHighPositionImpactAccepted}
          setIsChecked={priceImpactWarinigState.setIsHighPositionImpactAccepted}
        >
          <span className="text-warning font-sm">
            <Trans>Acknowledge high Price Impact</Trans>
          </span>
        </Checkbox>
      )}

      {priceImpactWarinigState.isHighSwapImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarinigState.isHighSwapImpactAccepted}
          setIsChecked={priceImpactWarinigState.setIsHighSwapImpactAccepted}
        >
          <span className="text-warning font-sm">
            <Trans>Acknowledge high Swap Impact</Trans>
          </span>
        </Checkbox>
      )}
    </div>
  );
}
