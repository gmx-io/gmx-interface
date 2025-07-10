import { useMemo } from "react";

import {
  selectGasPaymentToken,
  selectIsExpressTransactionAvailable,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectSubaccountForAction } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectShouldRequestExternalSwapQuote,
  selectTradeboxCollateralToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

export function useExternalSwapsEnabled(): boolean | undefined {
  const shouldRequestExternalSwapQuote = useSelector(selectShouldRequestExternalSwapQuote);

  const { isTwap } = useSelector(selectTradeboxTradeFlags);
  const isExpressTradingEnabled = useSelector(selectIsExpressTransactionAvailable);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);

  const disabledByExpressSchema = useMemo(() => {
    if (!isExpressTradingEnabled) {
      return false;
    }

    return gasPaymentToken === collateralToken;
  }, [collateralToken, gasPaymentToken, isExpressTradingEnabled]);

  const subaccount = useSelector(selectSubaccountForAction);

  return !disabledByExpressSchema && !isTwap && !subaccount && shouldRequestExternalSwapQuote;
}
