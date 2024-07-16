import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { useMemo } from "react";
import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { SwapSpreadRow } from "./SwapSpreadRow";

export function AdvancedDisplayRows({ enforceVisible = false }: { enforceVisible?: boolean }) {
  const { advancedDisplay: isVisible } = useSelector(selectTradeboxAdvancedOptions);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const fees = useSelector(selectTradeboxFees);

  const { isMarket, isLimit, isTrigger } = tradeFlags;

  const isInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      return limitPrice === undefined || limitPrice === 0n;
    }

    return decreaseAmounts && decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease;
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  if (!isVisible && !enforceVisible) {
    return null;
  }

  return (
    <>
      <SwapSpreadRow />
      <AvailableLiquidityRow />
      <CollateralSpreadRow />
      {isMarket && <AllowedSlippageRow />}
      {(isLimit || isTrigger) && (
        <AcceptablePriceImpactInputRow
          notAvailable={
            isInputDisabled ||
            defaultTriggerAcceptablePriceImpactBps === undefined ||
            selectedTriggerAcceptablePriceImpactBps === undefined
          }
          acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
          recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
          priceImpactFeeBps={fees?.positionPriceImpact?.bps}
          setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
        />
      )}
    </>
  );
}
