import { useMemo } from "react";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectExpressGlobalParams,
  selectIsExpressTransactionAvailable,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { useJsonRpcProvider } from "lib/rpc";
import { useThrottledAsync } from "lib/useThrottledAsyncEstimation";
import useWallet from "lib/wallets/useWallet";
import { BatchOrderTxnParams, getBatchIsNativePayment, getIsEmptyBatch } from "sdk/utils/orderTransactions";

import { ExpressTxnParams } from ".";
import { estimateExpressParams } from "./expressOrderUtils";
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

  const { data: fastExpressParams } = useThrottledAsync(
    async ({ params: p }) => {
      const nextApproximateParams = await estimateExpressParams({
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
      throttleMs: 500,
      leading: true,
      trailing: false,
    }
  );

  const { data: asyncExpressParams } = useThrottledAsync(
    async ({ params: p }) => {
      const expressParams = await estimateExpressParams({
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
      throttleMs: 2000,
      leading: true,
      trailing: false,
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

    const expressParams = asyncExpressParams || fastExpressParams;

    return {
      expressParams,
      expressEstimateMethod: expressParams?.estimationMethod,
      fastExpressParams,
      asyncExpressParams,
      isLoading: !fastExpressParams,
    };
  }, [isAvailable, asyncExpressParams, fastExpressParams]);

  useSwitchGasPaymentTokenIfRequired({ expressParams: result.expressParams });

  if (showDebugValues && label && result.expressParams) {
    throttleLog(`${label} express params`, {
      expressParams: result.expressParams,
      batchParams: orderParams,
    });
  }

  return result;
}
