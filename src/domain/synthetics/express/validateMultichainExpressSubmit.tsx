import { t } from "@lingui/macro";

import { ContractsChainId } from "config/chains";
import { ExpressTxnParams, GasPaymentParams } from "domain/synthetics/express";
import { getExpressError } from "domain/synthetics/trade/utils/validation";
import { TokenData, TokensData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import type { OrderMetricId } from "lib/metrics/types";
import { sendTxnValidationErrorMetric } from "lib/metrics/utils";
import { TradingActionName } from "lib/tradingErrorTracker";
import { getIsConfirmedOutOfGasPaymentTokenBalance, getIsValidExpressParams } from "sdk/utils/express";

import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";

import { getGasPaymentTokenUnavailableMessage } from "./useGasPaymentTokenUnavailableToast";

export function isMultichainExpressSubmitBlocked(
  isGmxAccount: boolean,
  expressParams: ExpressTxnParams | undefined
): boolean {
  return isGmxAccount && (!expressParams || !getIsValidExpressParams(expressParams));
}

export type ExpressTokenPermitBlockReason = "noExpressParams" | "gmxAccount" | "notEnoughGasToken";

/**
 * A permit travels inside the relay call, so it can stand in for an approval only when the order is
 * going to be relayed. Missing gas token approval doesn't count against it: a permit can cover that too,
 * and neither does a gas token balance that is still loading.
 */
export function getExpressTokenPermitBlockReason(
  expressParams: ExpressTxnParams | undefined
): ExpressTokenPermitBlockReason | undefined {
  if (expressParams === undefined) {
    return "noExpressParams";
  }

  if (expressParams.isGmxAccount) {
    return "gmxAccount";
  }

  if (getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations)) {
    return "notEnoughGasToken";
  }

  return undefined;
}

// a wallet short of the gas payment token falls back to a Classic transaction, which doesn't spend it
export function getGasPaymentTokenToApprove(
  expressParams: ExpressTxnParams | undefined
): { tokenAddress: string; amount: bigint } | undefined {
  if (!expressParams || getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations)) {
    return undefined;
  }

  return {
    tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
    amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
  };
}

export function getExpressParamsForSubmit(expressParams: ExpressTxnParams | undefined): ExpressTxnParams | undefined {
  return expressParams && getIsValidExpressParams(expressParams) ? expressParams : undefined;
}

export function getNetworkFeeGasPaymentParams({
  expressParams,
  tokensData,
  canApproveGasPaymentToken = true,
  canFallBackToClassic,
}: {
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
  canApproveGasPaymentToken?: boolean;
  canFallBackToClassic?: boolean;
}): GasPaymentParams | undefined {
  const isWalletClassicFallback =
    expressParams !== undefined &&
    !expressParams.isGmxAccount &&
    (canApproveGasPaymentToken
      ? getIsConfirmedOutOfGasPaymentTokenBalance(expressParams.gasPaymentValidations)
      : !getIsValidExpressParams(expressParams)) &&
    getExpressError({ expressParams, tokensData, canFallBackToClassic }).buttonErrorMessage === undefined;

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
  unavailableGasPaymentToken,
}: {
  isGmxAccount: boolean;
  expressParams: ExpressTxnParams | undefined;
  tokensData: TokensData | undefined;
  actionName: TradingActionName;
  collateral?: string;
  requestId?: string;
  metricId?: OrderMetricId;
  // the fee token when no params were estimated because it can't pay right now
  unavailableGasPaymentToken?: TokenData;
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
    ) : unavailableGasPaymentToken ? (
      getGasPaymentTokenUnavailableMessage({
        fromSymbol: unavailableGasPaymentToken.symbol,
        toSymbol: undefined,
        isGmxAccount: true,
      })
    ) : (
      t`Express is unavailable right now, so this GMX Account action can't be sent`
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
