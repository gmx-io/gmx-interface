import { useMemo } from "react";

import {
  selectGasPaymentToken,
  selectIsExpressTransactionAvailable,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectSubaccountForSettlementChainAction } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectShouldRequestExternalSwapQuote,
  selectTradeboxCollateralToken,
  selectTradeboxSelectSwapToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getWrappedToken } from "sdk/configs/tokens";

export function useExternalSwapsEnabled(): boolean | undefined {
  const shouldRequestExternalSwapQuote = useSelector(selectShouldRequestExternalSwapQuote);

  const { isTwap, isSwap } = useSelector(selectTradeboxTradeFlags);
  const isExpressTradingEnabled = useSelector(selectIsExpressTransactionAvailable);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);
  const { chainId } = useChainId();

  const disabledByExpressSchema = useMemo(() => {
    if (!isExpressTradingEnabled) {
      return false;
    }

    // When gasPaymentToken = WNT, relay fee goes directly to the relay router
    // (Branch B in _handleRelayFee) without syncing OrderVault balances — no conflict.
    const wrappedNativeAddress = getWrappedToken(chainId).address;
    if (gasPaymentToken?.address === wrappedNativeAddress) {
      return false;
    }

    const conflictToken = isSwap ? swapToToken : collateralToken;
    return conflictToken !== undefined && gasPaymentToken === conflictToken;
  }, [collateralToken, swapToToken, gasPaymentToken, isExpressTradingEnabled, isSwap, chainId]);

  const subaccount = useSelector(selectSubaccountForSettlementChainAction);

  return !disabledByExpressSchema && !isTwap && !subaccount && shouldRequestExternalSwapQuote;
}
