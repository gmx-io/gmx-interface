import { t } from "@lingui/macro";

import { ContractsChainId } from "config/chains";
import { ExpressTxnParams, GasPaymentParams } from "domain/synthetics/express";
import { getExpressError } from "domain/synthetics/trade/utils/validation";
import { TokensData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import type { OrderMetricId } from "lib/metrics/types";
import { sendTxnValidationErrorMetric } from "lib/metrics/utils";
import { TradingActionName } from "lib/tradingErrorTracker";
import { getIsConfirmedOutOfGasPaymentTokenBalance, getIsValidExpressParams } from "sdk/utils/express";

import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";

export function isMultichainExpressSubmitBlocked(
  isGmxAccount: boolean,
  expressParams: ExpressTxnParams | undefined
): boolean {
  return isGmxAccount && (!expressParams || !getIsValidExpressParams(expressParams));
}

/**
 * A permit travels inside the relay call, so it can stand in for an approval only when the order is
 * going to be relayed. Missing gas token approval doesn't count against it: a permit can cover that too.
 */
export function getCanUseTokenPermits(expressParams: ExpressTxnParams | undefined): boolean {
  return (
    expressParams !== undefined &&
    !expressParams.isGmxAccount &&
    !expressParams.gasPaymentValidations.isOutGasTokenBalance
  );
}

export function getExpressParamsForSubmit(expressParams: ExpressTxnParams | undefined): ExpressTxnParams | undefined {
  return expressParams && getIsValidExpressParams(expressParams) ? expressParams : undefined;
}

export function getNetworkFeeGasPaymentParams({
  expressParams,
  tokensData,
  canApproveGasPaymentToken = true,
}: {
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
  canApproveGasPaymentToken?: boolean;
}): GasPaymentParams | undefined {
  const isWalletClassicFallback =
    expressParams !== undefined &&
    !expressParams.isGmxAccount &&
    (canApproveGasPaymentToken
      ? getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations)
      : !getIsValidExpressParams(expressParams)) &&
    getExpressError({ expressParams, tokensData }).buttonErrorMessage === undefined;

  return isWalletClassicFallback ? undefined : expressParams?.gasPaymentParams;
}

export function reportMultichainExpressSubmitError({
  isGmxAccount,
  expressParams,
  tokensData,
  actionName,
  collateral,
  requestId,
  metricId,
}: {
  isGmxAccount: boolean;
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
  actionName: TradingActionName;
  collateral?: string;
  requestId?: string;
  metricId?: OrderMetricId;
}): boolean {
  if (!isMultichainExpressSubmitBlocked(isGmxAccount, expressParams)) {
    return false;
  }

  const expressError = getExpressError({ expressParams, tokensData });

  const content =
    expressParams && expressError.bannerErrorName ? (
      <InsufficientGmxAccountGasTokenBalanceMessage
        chainId={expressParams.chainId as ContractsChainId}
        gasPaymentTokenAddress={expressParams.gasPaymentParams.gasPaymentTokenAddress}
      />
    ) : (
      t`Express is unavailable right now, so this GMX Account action can't be sent.`
    );

  helperToast.error(content, {
    autoClose: expressError.bannerErrorName ? false : undefined,
    tradingErrorInfo: {
      actionName,
      collateral,
      requestId,
      errorData: {
        hasExpressParams: Boolean(expressParams),
        gasPaymentValidations: expressParams?.gasPaymentValidations,
      },
    },
  });

  if (metricId) {
    sendTxnValidationErrorMetric(metricId);
  }

  return true;
}
