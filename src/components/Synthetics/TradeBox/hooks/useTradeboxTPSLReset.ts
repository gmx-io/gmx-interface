import { useEffect } from "react";
import { usePrevious } from "react-use";

import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";

export function useTradeboxTPSLReset(setTriggerConsent: (value: boolean) => void) {
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const collateralToken = useSelector(selectTradeboxCollateralTokenAddress);
  const { isLong, isIncrease } = useSelector(selectTradeboxTradeFlags);

  const previouseFromTokenAddress = usePrevious(fromTokenAddress);
  const previousToTokenAddress = usePrevious(toTokenAddress);
  const previousIsLong = usePrevious(isLong);
  const previousMarketAddress = usePrevious(marketAddress);
  const previousCollateralToken = usePrevious(collateralToken);
  const previousIsIncrease = usePrevious(isIncrease);

  const { reset } = useSidecarOrders();

  const shouldResetLimitOrTPSL =
    fromTokenAddress !== previouseFromTokenAddress ||
    toTokenAddress !== previousToTokenAddress ||
    isLong !== previousIsLong ||
    marketAddress !== previousMarketAddress ||
    collateralToken !== previousCollateralToken ||
    isIncrease !== previousIsIncrease;

  useEffect(() => {
    if (shouldResetLimitOrTPSL) {
      setTriggerConsent(false);
      reset();
    }
  }, [reset, shouldResetLimitOrTPSL, setTriggerConsent]);
}
