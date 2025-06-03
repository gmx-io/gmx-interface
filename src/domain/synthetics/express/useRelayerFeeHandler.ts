import { useMemo } from "react";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectExpressGlobalParams,
  selectIsExpressTransactionAvailable,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { roundBigIntToDecimals } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
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
import { useSwitchGasPaymentTokenIfRequired } from "./useSwitchGasPaymentTokenIfRequired";

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
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
  label?: string;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const showDebugValues = useShowDebugValues();
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const isExpressAvailable = useSelector(selectIsExpressTransactionAvailable);

  const isAvailable = isExpressAvailable && orderParams && !getBatchIsNativePayment(orderParams);

  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

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

  const { data: fastExpressParams, promise: fastExpressPromise } = useThrottledAsync(
    async ({ params: p }) => {
      const nextApproximateParams = await estimateBatchExpressParams({
        chainId: p.chainId,
        batchParams: p.orderParams,
        signer: p.signer,
        provider: p.provider,
        globalExpressParams: p.globalExpressParams,
        requireValidations: false,
        estimationMethod: "approximate",
      });

      return nextApproximateParams;
    },
    {
      params:
        isAvailable && globalExpressParams && signer && orderParams
          ? {
              chainId,
              signer,
              provider,
              orderParams,
              globalExpressParams,
            }
          : undefined,
      forceRecalculate,
      throttleMs: 200,
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
      isLoading: !fastExpressParams,
      expressParamsPromise,
    };
  }, [isAvailable, asyncExpressParams, fastExpressParams, fastExpressPromise, asyncExpressPromise]);

  useSwitchGasPaymentTokenIfRequired({ expressParams: result.expressParams });

  if (showDebugValues && label && result.expressParams) {
    throttleLog(`${label} express params`, {
      expressParams: result.expressParams,
      batchParams: orderParams,
    });
  }

  return result;
}
