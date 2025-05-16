import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectRawSubaccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import {
  getIsNonceExpired,
  getIsSubaccountActive,
  getIsSubaccountExpired,
  getRemainingSubaccountActions,
} from "domain/synthetics/subaccount";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { useRequiredActions } from "./useRequiredActions";

export function useExpressTradingWarnings({ expressParams }: { expressParams: ExpressTxnParams | undefined }) {
  const fromToken = useSelector(selectTradeboxFromToken);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const isExpressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const { requiredActions } = useRequiredActions();

  const subaccount = useSelector(selectRawSubaccount);

  const isSubaccountActive = subaccount && getIsSubaccountActive(subaccount);

  const [nativeTokenWarningHidden] = useLocalStorageSerializeKey(EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY, false);

  const [wrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
    false
  );

  const remaining = subaccount ? getRemainingSubaccountActions(subaccount) : 0n;

  const isNativeToken = fromToken?.isNative;

  const conditions = {
    shouldShowWrapOrUnwrapWarning:
      !tradeFlags?.isTrigger && isExpressOrdersEnabled && !wrapOrUnwrapWarningHidden && isWrapOrUnwrap,
    shouldShowNativeTokenWarning:
      !tradeFlags?.isTrigger && isExpressOrdersEnabled && !nativeTokenWarningHidden && isNativeToken,
    shouldShowExpiredSubaccountWarning: isSubaccountActive && getIsSubaccountExpired(subaccount),
    shouldShowNonceExpiredWarning: isSubaccountActive && getIsNonceExpired(subaccount),
    shouldShowAllowedActionsWarning:
      isSubaccountActive && (remaining === 0n || remaining < requiredActions) && !isNativeToken,
    shouldShowOutOfGasPaymentBalanceWarning: expressParams?.relayFeeParams.isOutGasTokenBalance,
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  return {
    ...conditions,
    shouldShowWarning,
  };
}
