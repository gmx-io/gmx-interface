import { useCallback, useMemo } from "react";

import {
  EXPRESS_TRADING_ALLOWED_ACTIONS_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_EXPIRED_SUBACCOUNT_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectIsExpressTransactionAvailable } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectRawSubaccount,
  selectSrcChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapBlockReason,
  selectExternalSwapDesirability,
  selectIsExternalSwapDisabledByExpressSchema,
  selectIsOneClickActiveByUser,
  selectRawExternalSwapDesirability,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import {
  getIsConfirmedOutOfGasPaymentTokenBalance,
  getOrderRelayRouterAddress,
} from "domain/synthetics/express/expressOrderUtils";
import {
  getIsSubaccountActionsExceeded,
  getIsSubaccountApprovalInvalid,
  getIsSubaccountExpired,
  getIsSubaccountNonceExpired,
  getMaxSubaccountActions,
  getSubaccountExpiresAt,
} from "domain/synthetics/subaccount";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

export function useExpressTradingWarnings({
  isWrapOrUnwrap,
  expressParams,
  payTokenAddress,
  isGmxAccount,
  showExternalSwapWarnings,
}: {
  isWrapOrUnwrap: boolean;
  payTokenAddress: string | undefined;
  expressParams: ExpressTxnParams | undefined;
  isGmxAccount: boolean;
  showExternalSwapWarnings: boolean;
}) {
  const account = useSelector(selectAccount);
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const tokensData = useSelector(selectTokensData);
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const isExpressTransactionAvailable = useSelector(selectIsExpressTransactionAvailable);
  const rawSubaccount = useSelector(selectRawSubaccount);
  const isOneClickActiveByUser = useSelector(selectIsOneClickActiveByUser);
  const externalSwapDesirability = useSelector(selectExternalSwapDesirability);
  const rawExternalSwapDesirability = useSelector(selectRawExternalSwapDesirability);
  const externalSwapBlockReason = useSelector(selectExternalSwapBlockReason);
  const isExternalSwapBlockedByGasConflict = useSelector(selectIsExternalSwapDisabledByExpressSchema);

  const isNativePayment = payTokenAddress === NATIVE_TOKEN_ADDRESS;
  const subaccountValidations = expressParams?.subaccountValidations;

  const [nativeTokenWarningHidden] = useLocalStorageSerializeKey(EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY, false);
  const [wrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
    false
  );

  const [expiredSubaccountWarningDismissedKey, setExpiredSubaccountWarningDismissedKey] =
    useLocalStorageSerializeKey<string>(EXPRESS_TRADING_EXPIRED_SUBACCOUNT_WARN_HIDDEN_KEY, "");
  const [allowedActionsWarningDismissedKey, setAllowedActionsWarningDismissedKey] = useLocalStorageSerializeKey<string>(
    EXPRESS_TRADING_ALLOWED_ACTIONS_WARN_HIDDEN_KEY,
    ""
  );

  const expiredSubaccountWarningKey = useMemo(
    () =>
      rawSubaccount
        ? getOneClickWarningDismissalKey([
            account,
            chainId,
            isGmxAccount,
            rawSubaccount.address,
            getSubaccountExpiresAt(rawSubaccount),
          ])
        : undefined,
    [account, chainId, isGmxAccount, rawSubaccount]
  );
  const allowedActionsWarningKey = useMemo(
    () =>
      rawSubaccount
        ? getOneClickWarningDismissalKey([
            account,
            chainId,
            isGmxAccount,
            rawSubaccount.address,
            getMaxSubaccountActions(rawSubaccount),
          ])
        : undefined,
    [account, chainId, isGmxAccount, rawSubaccount]
  );

  const conditions = {
    shouldShowWrapOrUnwrapWarning: isExpressTransactionAvailable && isWrapOrUnwrap && !wrapOrUnwrapWarningHidden,
    shouldShowNativeTokenWarning:
      !tradeFlags?.isTrigger && isExpressTransactionAvailable && isNativePayment && !nativeTokenWarningHidden,
    shouldShowExpiredSubaccountWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isExpired ?? getIsSubaccountExpired(rawSubaccount)) &&
      expiredSubaccountWarningDismissedKey !== expiredSubaccountWarningKey,
    shouldShowNonceExpiredWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isNonceExpired ?? getIsSubaccountNonceExpired(rawSubaccount)),
    shouldShowAllowedActionsWarning:
      isExpressTransactionAvailable &&
      rawSubaccount &&
      (subaccountValidations?.isActionsExceeded ?? getIsSubaccountActionsExceeded(rawSubaccount, 1)) &&
      allowedActionsWarningDismissedKey !== allowedActionsWarningKey,
    shouldShowOutOfGasPaymentBalanceWarning:
      expressParams !== undefined &&
      getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations) &&
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
    shouldShowExternalSwapSubaccountBlockedWarning:
      showExternalSwapWarnings && externalSwapDesirability === "required" && isOneClickActiveByUser,
    shouldShowExternalSwapGasConflictRequiredWarning:
      showExternalSwapWarnings &&
      externalSwapDesirability === "required" &&
      !isOneClickActiveByUser &&
      isExternalSwapBlockedByGasConflict,
    shouldShowExternalSwapGasConflictOptionalWarning:
      showExternalSwapWarnings &&
      externalSwapDesirability === "optional" &&
      !isOneClickActiveByUser &&
      isExternalSwapBlockedByGasConflict,
    shouldShowExternalSwapNoRouteWarning:
      showExternalSwapWarnings &&
      rawExternalSwapDesirability === "required" &&
      externalSwapBlockReason === "noRouteFound",
    shouldShowExternalSwapTwapNotSupportedWarning:
      showExternalSwapWarnings &&
      rawExternalSwapDesirability === "required" &&
      externalSwapBlockReason === "orderTypeNotSupported" &&
      Boolean(tradeFlags?.isTwap && tradeFlags?.isSwap),
  };

  const shouldShowWarning = Object.values(conditions).some(Boolean);

  const dismissExpiredSubaccountWarning = useCallback(() => {
    if (expiredSubaccountWarningKey) {
      setExpiredSubaccountWarningDismissedKey(expiredSubaccountWarningKey);
    }
  }, [expiredSubaccountWarningKey, setExpiredSubaccountWarningDismissedKey]);

  const dismissAllowedActionsWarning = useCallback(() => {
    if (allowedActionsWarningKey) {
      setAllowedActionsWarningDismissedKey(allowedActionsWarningKey);
    }
  }, [allowedActionsWarningKey, setAllowedActionsWarningDismissedKey]);

  return {
    ...conditions,
    shouldShowWarning,
    dismissExpiredSubaccountWarning,
    dismissAllowedActionsWarning,
  };
}

function getOneClickWarningDismissalKey(parts: (string | number | bigint | boolean | undefined)[]): string {
  return parts.map((part) => (part === undefined ? "" : part.toString())).join(":");
}
