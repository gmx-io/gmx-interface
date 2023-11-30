import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";

export type Props = {
  priceImpactWarinigState: PriceImpactWarningState;
  className?: string;
  tradeFlags: TradeFlags;
  place: "tradebox" | "modal";
};

export function HighPriceImpactWarning({ priceImpactWarinigState, className, tradeFlags, place }: Props) {
  if (!priceImpactWarinigState.isHighPositionImpact && !priceImpactWarinigState.isHighSwapImpact) {
    return null;
  }

  const shouldShowSwapImpact =
    priceImpactWarinigState.isHighSwapImpact &&
    ((place === "tradebox" && !tradeFlags.isSwap) || (place === "modal" && tradeFlags.isSwap));
  const shouldShowPriceImpact = priceImpactWarinigState.isHighPositionImpact && place === "modal" && !tradeFlags.isSwap;

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
