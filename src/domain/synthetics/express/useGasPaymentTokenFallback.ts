import { t } from "@lingui/macro";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import {
  makeSelectExpressGlobalParamsForGasPaymentToken,
  selectSettlementChainExpressGlobalParams,
  selectUnavailableGasPaymentTokenAddresses,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectGasPaymentTokenAllowance,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectGasPaymentTokenAddress,
  selectGmxAccountGasPaymentTokenAddress,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
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
import { notifyGasPaymentTokenUnavailable } from "./useGasPaymentTokenUnavailableToast";

const GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID = "gas-payment-token-not-approved";

const notifyGasPaymentTokenNotApproved = ({ fromSymbol, toSymbol }: { fromSymbol: string; toSymbol: string }) => {
  const content = t`${fromSymbol} is not approved for fees. This order pays its network fee in ${toSymbol}.`;

  helperToast.infoOrUpdate(content, GAS_PAYMENT_TOKEN_NOT_APPROVED_TOAST_ID);
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
  baseGlobalExpressParams,
  fallback,
  isGmxAccount,
  payTokenFeeToken,
  payAmounts,
  canNotify,
}: {
  baseGlobalExpressParams: GlobalExpressParams | undefined;
  fallback: GasPaymentTokenFallback | undefined;
  isGmxAccount: boolean;
  payTokenFeeToken: PayTokenFeeToken | undefined;
  payAmounts: Record<string, bigint>;
  canNotify: boolean;
}): {
  globalExpressParams: GlobalExpressParams | undefined;
  recordExpressParams: (expressParams: ExpressTxnParams | undefined) => void;
  // only while the saved token can't pay
  replaceShortFeeToken: ((gasPaymentTokenAddress: string) => void) | undefined;
} {
  const chainId = useSelector(selectChainId);
  const tokensData = useSelector(selectTokensData);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);
  const unavailableTokenAddresses = useSelector(selectUnavailableGasPaymentTokenAddresses);
  const savedGasPaymentTokenAddress = useSelector(
    isGmxAccount ? selectGmxAccountGasPaymentTokenAddress : selectGasPaymentTokenAddress
  );
  const [localFeeUsdByToken, setLocalFeeUsdByToken] = useState<Record<string, bigint>>(EMPTY_OBJECT);
  const isPayTokenFallback = fallback === "skipApproval" && payTokenFeeToken !== undefined;
  const setFeeUsdByToken = isPayTokenFallback ? payTokenFeeToken.setFeeUsdByToken : setLocalFeeUsdByToken;

  const baseGasPaymentToken = baseGlobalExpressParams?.gasPaymentToken;

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
          unavailableTokenAddresses,
        });

  const isSavedTokenUnavailable = unavailableTokenAddresses.includes(savedGasPaymentTokenAddress);
  // picked for this form when the token paying for an unavailable saved one is short; it's never saved,
  // so the saved token pays again once it can
  const [shortFeeTokenReplacement, setShortFeeTokenReplacement] = useState<{
    address: string;
    isGmxAccount: boolean;
  }>();

  useEffect(() => {
    if (!isSavedTokenUnavailable) {
      setShortFeeTokenReplacement(undefined);
    }
  }, [isSavedTokenUnavailable]);

  const replacementTokenAddress =
    isSavedTokenUnavailable &&
    shortFeeTokenReplacement?.isGmxAccount === isGmxAccount &&
    !unavailableTokenAddresses.includes(shortFeeTokenReplacement.address)
      ? shortFeeTokenReplacement.address
      : undefined;

  const replaceShortFeeToken = useCallback(
    (address: string) =>
      setShortFeeTokenReplacement((prev) =>
        prev?.address === address && prev.isGmxAccount === isGmxAccount ? prev : { address, isGmxAccount }
      ),
    [isGmxAccount]
  );

  const gasPaymentTokenAddress =
    replacementTokenAddress ??
    (fallback && !isGmxAccount && baseGasPaymentToken
      ? resolveFallbackTokenAddress(baseGasPaymentToken)
      : baseGasPaymentToken?.address);

  const isFallbackActive =
    gasPaymentTokenAddress !== undefined && gasPaymentTokenAddress !== baseGasPaymentToken?.address;

  const fallbackGlobalExpressParams = useSelector(
    isFallbackActive
      ? makeSelectExpressGlobalParamsForGasPaymentToken(gasPaymentTokenAddress)
      : selectSettlementChainExpressGlobalParams
  );

  const globalExpressParams = isFallbackActive ? fallbackGlobalExpressParams : baseGlobalExpressParams;

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
    fromToken: baseGasPaymentToken,
    toToken:
      isFallbackActive && replacementTokenAddress === undefined
        ? getByKey(tokensData, gasPaymentTokenAddress)
        : undefined,
    // the copy is about an order, so only the trade box shows it
    enabled: isPayTokenFallback && canNotify,
  });

  return {
    globalExpressParams,
    recordExpressParams,
    replaceShortFeeToken: isSavedTokenUnavailable ? replaceShortFeeToken : undefined,
  };
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
    (params: Parameters<typeof estimateBatchExpressParams>[0]) => {
      const unavailableTokenAddresses = calcSelector(selectUnavailableGasPaymentTokenAddresses);
      const gasPaymentToken = params.globalExpressParams?.gasPaymentToken;

      // a GMX Account action is blocked instead, and its error names the token
      if (!params.isGmxAccount && gasPaymentToken && unavailableTokenAddresses.includes(gasPaymentToken.address)) {
        notifyGasPaymentTokenUnavailable({
          fromSymbol: gasPaymentToken.symbol,
          toSymbol: undefined,
          isGmxAccount: false,
        });
      }

      return estimateWithApprovedGasPaymentToken({
        chainId: params.chainId,
        isGmxAccount: params.isGmxAccount,
        globalExpressParams: params.globalExpressParams,
        payAmounts: getBatchTotalPayCollateralAmount(params.batchParams),
        estimate: (globalExpressParams) => estimateBatchExpressParams({ ...params, globalExpressParams }),
        getGlobalExpressParamsForGasPaymentToken: (gasPaymentTokenAddress) =>
          calcSelector(makeSelectExpressGlobalParamsForGasPaymentToken(gasPaymentTokenAddress)),
        unavailableTokenAddresses,
      });
    },
    [calcSelector]
  );
}
