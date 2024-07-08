import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { useEffect, useState } from "react";
import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { SwapSpreadRow } from "./SwapSpreadRow";

export function AdvancedDisplayRows({ enforceVisible = false }: { enforceVisible?: boolean }) {
  const { advancedDisplay: isVisible } = useSelector(selectTradeboxAdvancedOptions);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const fees = useSelector(selectTradeboxFees);

  const { savedAllowedSlippage } = useSettings();
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);

  const { isMarket, isLimit, isTrigger } = tradeFlags;

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage, isVisible]);

  const enableAcceptableImpactInput =
    (isLimit && increaseAmounts) ||
    (isTrigger && decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease);

  const acceptablePriceImpactBps = selectedTriggerAcceptablePriceImpactBps ?? 0n;
  const recommendedAcceptablePriceImpactBps = defaultTriggerAcceptablePriceImpactBps ?? 0n;
  const isZeroPrices = acceptablePriceImpactBps === 0n && recommendedAcceptablePriceImpactBps === 0n;

  if (!isVisible && !enforceVisible) {
    return null;
  }

  return (
    <>
      <SwapSpreadRow />
      <AvailableLiquidityRow />
      <CollateralSpreadRow />
      {isMarket && (
        <AllowedSlippageRow
          defaultSlippage={savedAllowedSlippage}
          allowedSlippage={allowedSlippage}
          setSlippage={setAllowedSlippage}
        />
      )}
      {(isLimit || isTrigger) && (
        <AcceptablePriceImpactInputRow
          notAvailable={!enableAcceptableImpactInput || isZeroPrices}
          acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps ?? 0n}
          recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps ?? 0n}
          priceImpactFeeBps={fees?.positionPriceImpact?.bps}
          setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
        />
      )}
    </>
  );
}
