import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";

export type Props = {
  priceImpactWarningState: PriceImpactWarningState;
  className?: string;
};

export function HighPriceImpactWarning({ priceImpactWarningState, className }: Props) {
  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  const shouldShowSwapImpact = priceImpactWarningState.shouldShowWarningForSwap;
  const shouldShowPriceImpact = priceImpactWarningState.shouldShowWarningForPosition;

  return (
    <div className={className}>
      {shouldShowPriceImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarningState.isHighPositionImpactAccepted}
          setIsChecked={priceImpactWarningState.setIsHighPositionImpactAccepted}
          qa="high-price-impact-warning"
        >
          <span className="text-body-small text-yellow-500">
            <Trans>High price impact. Review execution price.</Trans>
          </span>
        </Checkbox>
      )}

      {shouldShowSwapImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarningState.isHighSwapImpactAccepted}
          setIsChecked={priceImpactWarningState.setIsHighSwapImpactAccepted}
          qa="high-swap-impact-warning"
        >
          <span className="text-14 text-yellow-500">
            <Trans>Acknowledge high Swap Price Impact</Trans>
          </span>
        </Checkbox>
      )}
    </div>
  );
}
