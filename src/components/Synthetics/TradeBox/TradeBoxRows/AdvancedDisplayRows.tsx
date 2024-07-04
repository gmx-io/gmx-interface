import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  useTradeboxAdvancedOptions,
  useTradeboxDecreasePositionAmounts,
  useTradeboxDefaultTriggerAcceptablePriceImpactBps,
  useTradeboxFees,
  useTradeboxIncreasePositionAmounts,
  useTradeboxSelectedTriggerAcceptablePriceImpactBps,
  useTradeboxSetSelectedAcceptablePriceImpactBps,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { OrderType } from "domain/synthetics/orders";
import { useEffect, useMemo, useState } from "react";
import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { SwapSpreadRow } from "./SwapSpreadRow";

export function AdvancedDisplayRows({ enforceVisible = false }: { enforceVisible?: boolean }) {
  const { advancedDisplay: isVisible } = useTradeboxAdvancedOptions();
  const tradeFlags = useTradeboxTradeFlags();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const decreaseAmounts = useTradeboxDecreasePositionAmounts();

  const setSelectedTriggerAcceptablePriceImpactBps = useTradeboxSetSelectedAcceptablePriceImpactBps();
  const selectedTriggerAcceptablePriceImpactBps = useTradeboxSelectedTriggerAcceptablePriceImpactBps();
  const defaultTriggerAcceptablePriceImpactBps = useTradeboxDefaultTriggerAcceptablePriceImpactBps();
  const fees = useTradeboxFees();

  const { savedAllowedSlippage } = useSettings();
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);

  const { isMarket, isLimit, isTrigger } = tradeFlags;

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage, isVisible]);

  const enableAcceptableImpactInput =
    (isLimit && increaseAmounts) ||
    (isTrigger && decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease);

  const acceptablePriceImpactBps = useMemo(() => {
    return selectedTriggerAcceptablePriceImpactBps ?? 0n;
  }, [selectedTriggerAcceptablePriceImpactBps]);

  const recommendedAcceptablePriceImpactBps = useMemo(() => {
    return defaultTriggerAcceptablePriceImpactBps ?? 0n;
  }, [defaultTriggerAcceptablePriceImpactBps]);

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
