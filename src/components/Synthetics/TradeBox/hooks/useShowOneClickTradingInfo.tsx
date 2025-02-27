import {
  ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
  ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN,
} from "config/localStorage";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import {
  selectTradeboxExecutionFee,
  selectTradeboxFromToken,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useRequiredActions } from "./useRequiredActions";

export function useShowOneClickTradingInfo() {
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const fromToken = useSelector(selectTradeboxFromToken);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { requiredActions } = useRequiredActions();

  const isSubaccountActive = useIsSubaccountActive();

  const insufficientFunds = useSubaccountInsufficientFunds(executionFee?.feeTokenAmount);

  const [nativeTokenWarningHidden] = useLocalStorageSerializeKey(ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN, false);

  const [wrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN, false);

  const { remaining } = useSubaccountActionCounts();

  const isNativeToken = fromToken?.isNative;

  const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds && !isNativeToken;

  const shouldShowAllowedActionsWarning =
    isSubaccountActive && (remaining === 0n || remaining < BigInt(requiredActions)) && !isNativeToken;
  const shouldShowWrapOrUnwrapWarning =
    !tradeFlags?.isTrigger && isSubaccountActive && !wrapOrUnwrapWarningHidden && isWrapOrUnwrap;
  const shouldShowNativeTokenWarning =
    !tradeFlags?.isTrigger && isSubaccountActive && !nativeTokenWarningHidden && isNativeToken;

  const shouldShowWarning =
    shouldShowWrapOrUnwrapWarning ||
    shouldShowNativeTokenWarning ||
    shouldShowAllowedActionsWarning ||
    shouldShowInsufficientFundsButton;

  return {
    shouldShowWrapOrUnwrapWarning,
    shouldShowNativeTokenWarning,
    shouldShowAllowedActionsWarning,
    shouldShowInsufficientFundsButton,
    shouldShowWarning,
  };
}
