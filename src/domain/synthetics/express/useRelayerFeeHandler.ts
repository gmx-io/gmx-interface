import { useMemo } from "react";

import { makeSelectExpressGlobalParamsForActions } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { useJsonRpcProvider } from "lib/rpc";
import { retry, useThrottledAsync } from "lib/useThrottledAsyncEstimation";
import useWallet from "lib/wallets/useWallet";
import {
  BatchOrderTxnParams,
  getBatchIsNativePayment,
  getBatchRequiredActions,
  getIsEmptyBatch,
} from "sdk/utils/orderTransactions";

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
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const globalExpressParams = useSelector(
    makeSelectExpressGlobalParamsForActions(getBatchRequiredActions(orderParams))
  );

  const isEnabled =
    globalExpressParams && orderParams && !getIsEmptyBatch(orderParams) && !getBatchIsNativePayment(orderParams);

  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

  const { data: fastExpressParams } = useThrottledAsync(
    async ({ params: [p] }) => {
      if (!p.orderParams || !p.globalExpressParams || !p.signer) {
        return retry(undefined, 100);
      }

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
    [
      {
        chainId,
        signer,
        provider,
        orderParams,
        globalExpressParams,
      },
    ],
    { throttleMs: 1000, enabled: isEnabled }
  );

  const { data: asyncExpressParams } = useThrottledAsync(
    async ({ params: [p] }) => {
      if (!p.orderParams || !p.globalExpressParams || !p.signer || !p.provider) {
        return retry(undefined, 100);
      }

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
    [
      {
        chainId,
        signer,
        provider,
        orderParams,
        globalExpressParams,
      },
    ],
    { throttleMs: 2000, enabled: isEnabled && Boolean(fastExpressParams) }
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
