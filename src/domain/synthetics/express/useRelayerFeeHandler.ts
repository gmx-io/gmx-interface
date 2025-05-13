import { useMemo } from "react";
import { usePublicClient } from "wagmi";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { throttleLog } from "lib/logging";
import { useJsonRpcProvider } from "lib/rpc";
import { retry, useThrottledAsync } from "lib/useThrottledAsyncEstimation";
import useWallet from "lib/wallets/useWallet";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { getBatchIsNativePayment, getIsEmptyBatch } from "sdk/utils/orderTransactions";

import { ExpressTxnParams } from ".";
import { useSwitchGasPaymentTokenIfRequired } from "./useSwitchGasPaymentTokenIfRequired";
import { estimateExpressParams } from "../orders/expressOrderUtils";

export type ExpressOrdersParamsResult = {
  expressParams: ExpressTxnParams | undefined;
  isLoading: boolean;
};

export function useExpressOrdersParams({
  orderParams,
  totalExecutionFee,
  label,
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
  label?: string;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const showDebugValues = useShowDebugValues();
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const isEnabled =
    globalExpressParams && orderParams && !getIsEmptyBatch(orderParams) && !getBatchIsNativePayment(orderParams);

  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const settlementChainClient = usePublicClient({ chainId: chainId });

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
        settlementChainClient,
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
        settlementChainClient: p.settlementChainClient,
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
              settlementChainClient,
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

  if (showDebugValues && label && result.expressParams) {
    throttleLog(`${label} express params`, {
      expressParams: result.expressParams,
      batchParams: orderParams,
    });
  }

  return result;
}
