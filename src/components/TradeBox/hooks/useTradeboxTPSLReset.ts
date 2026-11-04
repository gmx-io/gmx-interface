import { useEffect } from "react";
import { usePrevious } from "react-use";

import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromTokenAddress,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxMarketAddress,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";

export function useTradeboxTPSLReset(setIsDismissed: (isDismissed: boolean) => void, isUsdgConversionActive: boolean) {
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const marketAddress = useSelector(selectTradeboxMarketAddress);
  const collateralToken = useSelector(selectTradeboxCollateralTokenAddress);
  const { isLong, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);

  const previouseFromTokenAddress = usePrevious(fromTokenAddress);
  const previousToTokenAddress = usePrevious(toTokenAddress);
  const previousIsLong = usePrevious(isLong);
  const previousMarketAddress = usePrevious(marketAddress);
  const previousCollateralToken = usePrevious(collateralToken);
  const previousIsIncrease = usePrevious(isIncrease);

  const { reset, carryOver } = useSidecarOrders();

  const isRemountDuringConversion = isUsdgConversionActive && previousIsIncrease === undefined;
  const isMarketChanged = toTokenAddress !== previousToTokenAddress;
  const shouldResetTPSL = !isRemountDuringConversion && isIncrease !== previousIsIncrease;
  const shouldCarryOverTPSL = !isRemountDuringConversion && (isMarketChanged || isLong !== previousIsLong);
  const shouldKeepTypedTPSLPrices = isTpSlEnabled && !isMarketChanged;

  const shouldResetPriceImpactWarning =
    shouldResetTPSL ||
    shouldCarryOverTPSL ||
    fromTokenAddress !== previouseFromTokenAddress ||
    marketAddress !== previousMarketAddress ||
    collateralToken !== previousCollateralToken;

  useEffect(() => {
    if (shouldResetPriceImpactWarning) {
      setIsDismissed(false);
    }

    if (shouldResetTPSL) {
      reset();
    } else if (shouldCarryOverTPSL) {
      carryOver({ keepTypedPrice: shouldKeepTypedTPSLPrices });
    }
  }, [
    carryOver,
    reset,
    setIsDismissed,
    shouldCarryOverTPSL,
    shouldKeepTypedTPSLPrices,
    shouldResetPriceImpactWarning,
    shouldResetTPSL,
  ]);
}
