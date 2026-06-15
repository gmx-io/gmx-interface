import { t } from "@lingui/macro";

import { ExpressTxnParams } from "domain/synthetics/express";
import { getExpressError } from "domain/synthetics/trade/utils/validation";
import { TokensData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import type { OrderMetricId } from "lib/metrics/types";
import { sendTxnValidationErrorMetric } from "lib/metrics/utils";
import { TradingActionName } from "lib/tradingErrorTracker";
import { getIsValidExpressParams } from "sdk/utils/express";

export function isMultichainExpressSubmitBlocked(
  isGmxAccount: boolean,
  expressParams: ExpressTxnParams | undefined
): boolean {
  return isGmxAccount && (!expressParams || !getIsValidExpressParams(expressParams));
}

export function getExpressParamsForSubmit(expressParams: ExpressTxnParams | undefined): ExpressTxnParams | undefined {
  return expressParams && getIsValidExpressParams(expressParams) ? expressParams : undefined;
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

  helperToast.error(expressError.buttonErrorMessage ?? t`Order submission failed`, {
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
