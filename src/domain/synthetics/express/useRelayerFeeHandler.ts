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
import { sleep } from "lib/sleep";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import {
  BatchOrderTxnParams,
  getBatchExternalSwapGasLimit,
  getBatchIsNativePayment,
  getBatchRequiredActions,
  getBatchSwapsCount,
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

  const executionFee =
    orderParams && globalExpressParams
      ? getBatchTotalExecutionFee({ batchParams: orderParams, chainId, tokensData: globalExpressParams.tokensData })
      : undefined;
  const executionFeeKey = executionFee
    ? roundBigIntToDecimals(executionFee.feeTokenAmount, executionFee.feeToken.decimals, 2)
    : undefined;
  const externalSwapGasLimit = orderParams ? getBatchExternalSwapGasLimit(orderParams) : undefined;
  const requiredActions = orderParams ? getBatchRequiredActions(orderParams) : undefined;
  const swapsCount = orderParams ? getBatchSwapsCount(orderParams) : undefined;

  const { data: fastExpressParams, isLoading: isFastExpressParamsLoading } = useThrottledAsync(
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
      throttleMs: 200,
      leading: true,
      trailing: false,
    }
  );

  const { data: asyncExpressParams, isLoading: isAsyncExpressParamsLoading } = useThrottledAsync(
    async ({ params: p }) => {
      const expressParams = await Promise.race([
        estimateBatchExpressParams({
          chainId: p.chainId,
          batchParams: p.orderParams,
          signer: p.signer,
          provider: p.provider,
          globalExpressParams: p.globalExpressParams,
          requireValidations: false,
          estimationMethod: "estimateGas",
        }),
        sleep(1000).then(() => undefined),
      ]);

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
      dataKey: [
        executionFeeKey,
        requiredActions,
        swapsCount,
        externalSwapGasLimit,
        globalExpressParams?.gasPaymentTokenAddress,
      ],
      throttleMs: 2000,
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
      };
    }

    let expressParams: ExpressTxnParams | undefined;

    if (asyncExpressParams && !isAsyncExpressParamsLoading) {
      expressParams = asyncExpressParams;
    } else if (fastExpressParams && !isFastExpressParamsLoading) {
      expressParams = fastExpressParams;
    }

    return {
      expressParams,
      expressEstimateMethod: expressParams?.estimationMethod,
      fastExpressParams,
      asyncExpressParams,
      isLoading: !fastExpressParams,
    };
  }, [isAvailable, asyncExpressParams, isAsyncExpressParamsLoading, fastExpressParams, isFastExpressParamsLoading]);

  useSwitchGasPaymentTokenIfRequired({ expressParams: result.expressParams });

  if (showDebugValues && label && result.expressParams) {
    throttleLog(`${label} express params`, {
      expressParams: result.expressParams,
      batchParams: orderParams,
    });
  }

  return result;
}
