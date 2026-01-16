import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectIsExpressTransactionAvailable } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectRawSubaccount,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { getOrderRelayRouterAddress } from "domain/synthetics/express/expressOrderUtils";
import {
  getIsSubaccountActionsExceeded,
  getIsSubaccountApprovalInvalid,
  getIsSubaccountExpired,
  getIsSubaccountNonceExpired,
} from "domain/synthetics/subaccount";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

export function useExpressTradingWarnings({
  isWrapOrUnwrap,
  expressParams,
  payTokenAddress,
  isGmxAccount,
}: {
  isWrapOrUnwrap: boolean;
  payTokenAddress: string | undefined;
  expressParams: ExpressTxnParams | undefined;
  isGmxAccount: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
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
    shouldShowSubaccountApprovalInvalidWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      getIsSubaccountApprovalInvalid({
        chainId,
        signedApproval: rawSubaccount.signedApproval,
        subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, isGmxAccount),
        onchainData: rawSubaccount.onchainData,
        signerChainId: srcChainId ?? chainId,
      }),
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  return {
    ...conditions,
    shouldShowWarning,
  };
}
