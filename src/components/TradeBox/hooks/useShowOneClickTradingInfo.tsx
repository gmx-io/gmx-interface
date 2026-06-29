import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectIsExpressTransactionAvailable } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectRawSubaccount,
  selectSrcChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapDesirability,
  selectIsExternalSwapDisabledByExpressSchema,
  selectIsOneClickActiveByUser,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import { getOrderRelayRouterAddress } from "domain/synthetics/express/expressOrderUtils";
import {
  getIsSubaccountActionsExceeded,
  getIsSubaccountApprovalInvalid,
  getIsSubaccountExpired,
  getIsSubaccountNonceExpired,
} from "domain/synthetics/subaccount";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

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
  const tokensData = useSelector(selectTokensData);
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const isExpressTransactionAvailable = useSelector(selectIsExpressTransactionAvailable);
  const rawSubaccount = useSelector(selectRawSubaccount);
  const isOneClickActiveByUser = useSelector(selectIsOneClickActiveByUser);
  const externalSwapDesirability = useSelector(selectExternalSwapDesirability);
  const isExternalSwapBlockedByGasConflict = useSelector(selectIsExternalSwapDisabledByExpressSchema);

  const isNativePayment = payTokenAddress === NATIVE_TOKEN_ADDRESS;
  const subaccountValidations = expressParams?.subaccountValidations;

  const wrappedToken = getByKey(tokensData, getWrappedToken(chainId).address);
  const wrappedTokenBalance = isGmxAccount ? wrappedToken?.gmxAccountBalance : wrappedToken?.walletBalance;
  const hasWrappedTokenBalance = (wrappedTokenBalance ?? 0n) > 0n;

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
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isExpired ?? getIsSubaccountExpired(rawSubaccount)),
    shouldShowNonceExpiredWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isNonceExpired ?? getIsSubaccountNonceExpired(rawSubaccount)),
    shouldShowAllowedActionsWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isActionsExceeded ?? getIsSubaccountActionsExceeded(rawSubaccount, 1)),
    shouldShowOutOfGasPaymentBalanceWarning:
      expressParams?.gasPaymentValidations.isOutGasTokenBalance &&
      !isGmxAccount &&
      nativeToken?.walletBalance !== undefined &&
      nativeToken.walletBalance > expressParams.gasPaymentParams.totalRelayerFeeTokenAmount,
    shouldShowSubaccountApprovalInvalidWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isApprovalInvalid ??
        getIsSubaccountApprovalInvalid({
          chainId,
          signedApproval: rawSubaccount.signedApproval,
          subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, isGmxAccount),
          onchainData: rawSubaccount.onchainData,
          signerChainId: srcChainId ?? chainId,
        })),
    shouldShowExternalSwapSubaccountBlockedWarning: externalSwapDesirability === "required" && isOneClickActiveByUser,
    shouldShowExternalSwapGasConflictRequiredWarning:
      externalSwapDesirability === "required" && !isOneClickActiveByUser && isExternalSwapBlockedByGasConflict,
    shouldShowExternalSwapGasConflictOptionalWarning:
      externalSwapDesirability === "optional" &&
      !isOneClickActiveByUser &&
      isExternalSwapBlockedByGasConflict &&
      hasWrappedTokenBalance,
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  return {
    ...conditions,
    shouldShowWarning,
  };
}
