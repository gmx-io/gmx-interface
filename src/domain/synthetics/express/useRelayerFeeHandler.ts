import { useMemo } from "react";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectExpressGlobalParams,
  selectIsExpressTransactionAvailable,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectSubaccountForMultichainAction,
  selectSubaccountForSettlementChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { FAST_EXPRESS_PARAMS_TIMEOUT_ERROR } from "lib/errors/customErrors";
import { throttleLog } from "lib/logging";
import { metrics } from "lib/metrics";
import { roundBigIntToDecimals } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import {
  BatchOrderTxnParams,
  getBatchExternalSwapGasLimit,
  getBatchIsNativePayment,
  getBatchRequiredActions,
  getBatchTotalExecutionFee,
  getIsEmptyBatch,
} from "sdk/utils/orderTransactions";

import { ExpressTxnParams } from ".";
import { estimateBatchExpressParams } from "./expressOrderUtils";
import { useSwitchGasPaymentTokenIfRequiredFromExpressParams } from "./useSwitchGasPaymentTokenIfRequired";

export type ExpressOrdersParamsResult = {
  expressParams: ExpressTxnParams | undefined;
  fastExpressParams: ExpressTxnParams | undefined;
  asyncExpressParams: ExpressTxnParams | undefined;
  expressParamsPromise: Promise<ExpressTxnParams | undefined> | undefined;
  isLoading: boolean;
};

export function useExpressOrdersParams({
  orderParams,
  label,
  isGmxAccount,
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
  label?: string;
  isGmxAccount: boolean;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const showDebugValues = useShowDebugValues();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(
    isGmxAccount ? selectSubaccountForMultichainAction : selectSubaccountForSettlementChainAction
  );
  const isExpressAvailable = useSelector(selectIsExpressTransactionAvailable);

  const isAvailable = isExpressAvailable && orderParams && !getBatchIsNativePayment(orderParams);

  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId, { isExpress: isExpressAvailable });

  const requiredActions = orderParams ? getBatchRequiredActions(orderParams) : undefined;
  const executionFee =
    orderParams && globalExpressParams
      ? getBatchTotalExecutionFee({ batchParams: orderParams, chainId, tokensData: globalExpressParams.tokensData })
      : undefined;
  const executionFeeKey = executionFee
    ? roundBigIntToDecimals(executionFee.feeTokenAmount, executionFee.feeToken.decimals, 6)
    : undefined;
  const externalSwapGasLimit = orderParams ? getBatchExternalSwapGasLimit(orderParams) : undefined;

  const estimationKey = `${executionFeeKey}:${requiredActions}:${externalSwapGasLimit}:${globalExpressParams?.gasPaymentTokenAddress}`;
  const prevEstimationKey = usePrevious(estimationKey);

  const forceRecalculate = estimationKey !== prevEstimationKey;

  const {
    data: fastExpressParams,
    promise: fastExpressPromise,
    error: fastExpressError,
  } = useThrottledAsync(
    async ({ params: p }) => {
      try {
        const nextApproximateParams = await Promise.race([
          estimateBatchExpressParams({
            chainId: p.chainId,
            batchParams: p.orderParams,
            signer: p.signer,
            provider: p.provider,
            globalExpressParams: p.globalExpressParams,
            requireValidations: false,
            estimationMethod: "approximate",
            isGmxAccount: p.isGmxAccount,
            subaccount: p.subaccount,
          }),
          sleep(5000).then(() => {
            throw new Error(FAST_EXPRESS_PARAMS_TIMEOUT_ERROR);
          }),
        ]);

        return nextApproximateParams;
      } catch (error) {
        metrics.pushError(error, `fastExpressParams.error.${label}`);
        throw error;
      }
    },
    {
      params:
        isAvailable && globalExpressParams && signer && orderParams && provider
          ? {
              chainId,
              signer,
              provider,
              orderParams,
              globalExpressParams,
              isGmxAccount,
              subaccount,
            }
          : undefined,
      forceRecalculate,
      throttleMs: globalExpressParams?.isSponsoredCall ? 200 : 5000,
      leading: true,
      trailing: false,
      withLoading: true,
    }
  );

  const { data: asyncExpressParams, promise: asyncExpressPromise } = useThrottledAsync(
    async ({ params: p }) => {
      const expressParams = estimateBatchExpressParams({
        chainId: p.chainId,
        batchParams: p.orderParams,
        signer: p.signer,
        provider: p.provider,
        globalExpressParams: p.globalExpressParams,
        requireValidations: false,
        estimationMethod: "estimateGas",
        isGmxAccount: p.isGmxAccount,
        subaccount: p.subaccount,
      });

      return expressParams;
    },
    {
      params:
        isAvailable && globalExpressParams && fastExpressParams && provider && signer && !getIsEmptyBatch(orderParams)
          ? {
              chainId,
              signer,
              provider,
              orderParams,
              globalExpressParams,
              isGmxAccount,
              subaccount,
            }
          : undefined,
      forceRecalculate,
      throttleMs: 5000,
      leading: true,
      trailing: false,
      withLoading: true,
    }
  );

  const result = useMemo(() => {
    if (!isAvailable) {
      return {
        expressParams: undefined,
        expressEstimateMethod: undefined,
        fastExpressParams: undefined,
        asyncExpressParams: undefined,
        isLoading: false,
        expressParamsPromise: undefined,
      };
    }

    const expressParams = asyncExpressParams || fastExpressParams;

    const expressParamsPromise = Promise.race([fastExpressPromise, asyncExpressPromise])
      .then((result) => {
        return result;
      })
      .catch(() => undefined);

    return {
      expressParams,
      expressEstimateMethod: expressParams?.estimationMethod,
      fastExpressParams,
      asyncExpressParams,
      isLoading: !getIsEmptyBatch(orderParams) && !fastExpressParams && !fastExpressError,
      expressParamsPromise,
    };
  }, [
    isAvailable,
    asyncExpressParams,
    fastExpressParams,
    fastExpressPromise,
    asyncExpressPromise,
    orderParams,
    fastExpressError,
  ]);

  useSwitchGasPaymentTokenIfRequiredFromExpressParams({
    expressParams: result.expressParams,
    isGmxAccount,
  });

  if (showDebugValues && label && result.expressParams) {
    throttleLog(`${label} express params`, {
      expressParams: result.expressParams,
      batchParams: orderParams,
    });
  }

  return result;
}
