import { useMemo } from "react";

import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { useJsonRpcProvider } from "lib/rpc";
import { retry, useThrottledAsync } from "lib/useThrottledAsyncEstimation";
import useWallet from "lib/wallets/useWallet";
import { BatchOrderTxnParams, getBatchIsNativePayment, getIsEmptyBatch } from "sdk/utils/orderTransactions";

import { ExpressTxnParams } from ".";
import { estimateExpressParams } from "../orders/expressOrderUtils";
import { useSwitchGasPaymentTokenIfRequired } from "./useSwitchGasPaymentTokenIfRequired";

export type ExpressOrdersParamsResult = {
  expressParams: ExpressTxnParams | undefined;
  isLoading: boolean;
};

export function useExpressOrdersParams({
  orderParams,
  totalExecutionFee,
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const isEnabled =
    globalExpressParams && orderParams && !getIsEmptyBatch(orderParams) && !getBatchIsNativePayment(orderParams);

  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

  const { data: fastExpressParams } = useThrottledAsync(
    async ({ params: p }) => {
      const nextApproximateParams = await estimateExpressParams({
        chainId: p.chainId,
        batchParams: p.orderParams,
        signer: p.signer,
        provider: undefined,
        globalExpressParams: p.globalExpressParams,
        requireGasPaymentTokenApproval: false,
        totalExecutionFee: totalExecutionFee,
        estimationMethod: "approximate",
      });

      if (!nextApproximateParams) {
        return retry(undefined, 100);
      }

      return nextApproximateParams;
    },
    {
      params:
        isEnabled && globalExpressParams && signer && !getIsEmptyBatch(orderParams)
          ? {
              chainId,
              signer,
              provider,
              orderParams,
              globalExpressParams,
            }
          : undefined,
      throttleMs: 1000,
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
        requireGasPaymentTokenApproval: false,
        totalExecutionFee: totalExecutionFee,
        estimationMethod: "estimateGas",
      });

      return expressParams;
    },
    {
      params:
        isEnabled && fastExpressParams && provider && signer && !getIsEmptyBatch(orderParams)
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
    if (!isEnabled) {
      return {
        expressParams: undefined,
        expressEstimateMethod: undefined,
        isLoading: false,
      };
    }

    if (asyncExpressParams) {
      return {
        expressParams: asyncExpressParams,
        isLoading: false,
      };
    }

    return {
      expressParams: fastExpressParams,
      isLoading: !fastExpressParams,
    };
  }, [isEnabled, asyncExpressParams, fastExpressParams]);

  useSwitchGasPaymentTokenIfRequired({ expressParams: result.expressParams });

  return result;
}
