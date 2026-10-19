import { t } from "@lingui/macro";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  makeSelectSettlementChainExpressGlobalParamsForGasPaymentToken,
  selectSettlementChainExpressGlobalParams,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectGasPaymentTokenAllowance,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { convertToUsd, type TokenData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { getBatchTotalPayCollateralAmount } from "sdk/utils/orderTransactions";

import { estimateBatchExpressParams } from "./expressOrderUtils";
import {
  estimateWithApprovedGasPaymentToken,
  type GasPaymentTokenFallback,
  resolveGasPaymentTokenAddress,
} from "./gasPaymentTokenFallback";
import type { ExpressTxnParams, GlobalExpressParams } from "./types";

const GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID = "gas-payment-token-not-approved";

const notifyGasPaymentTokenNotApproved = ({ fromSymbol, toSymbol }: { fromSymbol: string; toSymbol: string }) => {
  const content = t`${fromSymbol} is not approved for fees. This order pays its network fee in ${toSymbol}.`;

  if (toast.isActive(GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID)) {
    toast.update(GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID, { render: content });
  } else {
    helperToast.info(content, { toastId: GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID });
  }
};

/**
 * The trade box resolves its fee token in a selector (`selectTradeboxExpressFeeTokenAddress`) so other selectors
 * see the same token; it passes the result here together with the setter for the fee estimates it reads
 */
export type PayTokenFeeToken = {
  address: string | undefined;
  setFeeUsdByToken: Dispatch<SetStateAction<Record<string, bigint>>>;
};

export function useGasPaymentTokenFallback({
  savedGlobalExpressParams,
  fallback,
  isGmxAccount,
  payTokenFeeToken,
  payAmounts,
  canNotify,
}: {
  savedGlobalExpressParams: GlobalExpressParams | undefined;
  fallback: GasPaymentTokenFallback | undefined;
  isGmxAccount: boolean;
  payTokenFeeToken: PayTokenFeeToken | undefined;
  payAmounts: Record<string, bigint>;
  canNotify: boolean;
}): {
  globalExpressParams: GlobalExpressParams | undefined;
  recordExpressParams: (expressParams: ExpressTxnParams | undefined) => void;
} {
  const chainId = useSelector(selectChainId);
  const tokensData = useSelector(selectTokensData);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);
  const [localFeeUsdByToken, setLocalFeeUsdByToken] = useState<Record<string, bigint>>(EMPTY_OBJECT);
  const isPayTokenFallback = fallback === "payToken" && payTokenFeeToken !== undefined;
  const setFeeUsdByToken = isPayTokenFallback ? payTokenFeeToken.setFeeUsdByToken : setLocalFeeUsdByToken;

  const savedGasPaymentToken = savedGlobalExpressParams?.gasPaymentToken;

  const resolveFallbackTokenAddress = (gasPaymentToken: TokenData) =>
    isPayTokenFallback
      ? payTokenFeeToken.address ?? gasPaymentToken.address
      : resolveGasPaymentTokenAddress({
          chainId,
          fallback: fallback!,
          gasPaymentToken,
          payTokenAddress: undefined,
          payAmounts,
          feeUsdByToken: localFeeUsdByToken,
          tokensData,
          tokensAllowanceData: gasPaymentTokenAllowance?.tokensAllowanceData,
          tokenPermits,
        });

  const gasPaymentTokenAddress =
    fallback && !isGmxAccount && savedGasPaymentToken
      ? resolveFallbackTokenAddress(savedGasPaymentToken)
      : savedGasPaymentToken?.address;

  const isFallbackActive =
    gasPaymentTokenAddress !== undefined && gasPaymentTokenAddress !== savedGasPaymentToken?.address;

  const fallbackGlobalExpressParams = useSelector(
    isFallbackActive
      ? makeSelectSettlementChainExpressGlobalParamsForGasPaymentToken(gasPaymentTokenAddress)
      : selectSettlementChainExpressGlobalParams
  );

  const globalExpressParams = isFallbackActive ? fallbackGlobalExpressParams : savedGlobalExpressParams;

  const recordExpressParams = useCallback(
    (expressParams: ExpressTxnParams | undefined) => {
      if (!expressParams || expressParams.isGmxAccount) return;

      const { gasPaymentToken, gasPaymentTokenAmount } = expressParams.gasPaymentParams;
      const feeUsd = convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);
      if (feeUsd === undefined) return;

      setFeeUsdByToken((prev) =>
        prev[gasPaymentToken.address] === feeUsd ? prev : { ...prev, [gasPaymentToken.address]: feeUsd }
      );
    },
    [setFeeUsdByToken]
  );

  useGasPaymentTokenNotApprovedToast({
    fromToken: savedGasPaymentToken,
    toToken: isFallbackActive ? getByKey(tokensData, gasPaymentTokenAddress) : undefined,
    enabled: fallback === "payToken" && canNotify,
  });

  return { globalExpressParams, recordExpressParams };
}

function useGasPaymentTokenNotApprovedToast({
  fromToken,
  toToken,
  enabled,
}: {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  enabled: boolean;
}) {
  const notifiedKeyRef = useRef<string | undefined>(undefined);
  const fromSymbol = fromToken?.symbol;
  const toSymbol = toToken?.symbol;

  useEffect(
    function notifyGasPaymentTokenNotApprovedEff() {
      if (!fromSymbol || !toSymbol) {
        notifiedKeyRef.current = undefined;
        return;
      }

      const notifiedKey = `${fromSymbol}:${toSymbol}`;
      if (!enabled || notifiedKeyRef.current === notifiedKey) return;

      notifiedKeyRef.current = notifiedKey;
      notifyGasPaymentTokenNotApproved({ fromSymbol, toSymbol });
    },
    [enabled, fromSymbol, toSymbol]
  );
}

/**
 * Same as `estimateBatchExpressParams`, but when the saved gas payment token is not approved or short,
 * estimates with another approved gas payment token instead of falling back to a Classic transaction
 */
export function useEstimateBatchExpressParamsWithApprovedGasToken() {
  const calcSelector = useCalcSelector();

  return useCallback(
    (params: Parameters<typeof estimateBatchExpressParams>[0]) =>
      estimateWithApprovedGasPaymentToken({
        chainId: params.chainId,
        isGmxAccount: params.isGmxAccount,
        globalExpressParams: params.globalExpressParams,
        payAmounts: getBatchTotalPayCollateralAmount(params.batchParams),
        estimate: (globalExpressParams) => estimateBatchExpressParams({ ...params, globalExpressParams }),
        getGlobalExpressParamsForGasPaymentToken: (gasPaymentTokenAddress) =>
          calcSelector(makeSelectSettlementChainExpressGlobalParamsForGasPaymentToken(gasPaymentTokenAddress)),
      }),
    [calcSelector]
  );
}
