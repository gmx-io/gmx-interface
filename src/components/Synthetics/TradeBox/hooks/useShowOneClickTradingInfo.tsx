import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectRawSubaccount } from "context/SyntheticsStateContext/selectors/subaccountSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getIsNonceExpired,
  getIsSubaccountExpired,
  getRemainingSubaccountActions,
} from "domain/synthetics/gassless/txns/subaccountUtils";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { useRequiredActions } from "./useRequiredActions";

export function useExpressTradingWarnings() {
  const fromToken = useSelector(selectTradeboxFromToken);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const isExpressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const { requiredActions } = useRequiredActions();

  const subaccount = useSelector(selectRawSubaccount);

  const isSubaccountActive = subaccount?.optimisticActive;

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
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  return {
    ...conditions,
    shouldShowWarning,
  };
}
