import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";

export type Props = {
  priceImpactWarinigState: PriceImpactWarningState;
  className?: string;
  tradeFlags: TradeFlags;
  place: "tradeBox" | "positionSeller" | "confimationBox";
};

export function HighPriceImpactWarning({ priceImpactWarinigState, className, tradeFlags, place }: Props) {
  if (!priceImpactWarinigState.isHighPositionImpact && !priceImpactWarinigState.isHighSwapImpact) {
    return null;
  }

  const shouldShowSwapImpact =
    priceImpactWarinigState.isHighSwapImpact &&
    ((place === "tradeBox" && !tradeFlags.isSwap) ||
      (place === "confimationBox" && tradeFlags.isSwap) ||
      place === "positionSeller");
  const shouldShowPriceImpact =
    priceImpactWarinigState.isHighPositionImpact && place === "confimationBox" && !tradeFlags.isSwap;

  return (
    <div className={className}>
      {shouldShowPriceImpact && (
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

      {shouldShowSwapImpact && (
        <Checkbox
          asRow
          isChecked={priceImpactWarinigState.isHighSwapImpactAccepted}
          setIsChecked={priceImpactWarinigState.setIsHighSwapImpactAccepted}
        >
          <span className="text-warning font-sm">
            <Trans>Acknowledge high Swap Price Impact</Trans>
          </span>
        </Checkbox>
      )}
    </div>
  );
}
