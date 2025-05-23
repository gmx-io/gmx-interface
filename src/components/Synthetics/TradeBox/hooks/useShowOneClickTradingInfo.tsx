import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectIsExpressTransactionAvailable } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectRawSubaccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import {
  getIsSubaccountActionsExceeded,
  getIsSubaccountExpired,
  getIsSubaccountNonceExpired,
} from "domain/synthetics/subaccount";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

export function useExpressTradingWarnings({
  isWrapOrUnwrap,
  expressParams,
  payTokenAddress,
}: {
  isWrapOrUnwrap: boolean;
  payTokenAddress: string | undefined;
  expressParams: ExpressTxnParams | undefined;
}) {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const isExpressTransactionAvailable = useSelector(selectIsExpressTransactionAvailable);
  const rawSubaccount = useSelector(selectRawSubaccount);

  const isNativePayment = payTokenAddress === NATIVE_TOKEN_ADDRESS;

  const [nativeTokenWarningHidden] = useLocalStorageSerializeKey(EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY, false);
  const [wrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
    false
  );

  const conditions = {
    shouldShowWrapOrUnwrapWarning: isExpressTransactionAvailable && isWrapOrUnwrap && !wrapOrUnwrapWarningHidden,
    shouldShowNativeTokenWarning:
      !tradeFlags?.isTrigger && isExpressTransactionAvailable && isNativePayment && !nativeTokenWarningHidden,
    shouldShowExpiredSubaccountWarning:
      isExpressTransactionAvailable && rawSubaccount && getIsSubaccountExpired(rawSubaccount),
    shouldShowNonceExpiredWarning:
      isExpressTransactionAvailable && rawSubaccount && getIsSubaccountNonceExpired(rawSubaccount),
    shouldShowAllowedActionsWarning:
      isExpressTransactionAvailable && rawSubaccount && getIsSubaccountActionsExceeded(rawSubaccount, 1),
    shouldShowOutOfGasPaymentBalanceWarning: expressParams?.gasPaymentValidations.isOutGasTokenBalance,
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  return {
    ...conditions,
    shouldShowWarning,
  };
}
