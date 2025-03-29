import { t } from "@lingui/macro";
import { ethers } from "ethers";

import { getGasLimit, getGasPrice } from "lib/contracts";
import { OrderErrorContext } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";

import { getTxnErrorToastContent } from "components/Errors/txnErrorsToasts";

export type PrepareOrderTxnParams = {
  simulationPromise?: Promise<void>;
};

export async function prepareOrderTxn(
  chainId: number,
  contract: ethers.Contract,
  method: string,
  params: any[],
  value: bigint,
  simulationPromise?: Promise<any>,
  metricId?: OrderMetricId,
  additinalErrorContent?: React.ReactNode
) {
  if (!contract.runner?.provider) {
    helperToast.error(t`Error preparing transaction. Provider is not defined`);
    throw new Error("Provider is not defined");
  }

  const [gasLimit, gasPriceData] = await Promise.all([
    getGasLimit(contract, method, params, value).catch(
      makeCatchTransactionError(chainId, metricId, "gasLimit", additinalErrorContent)
    ),
    getGasPrice(contract.runner.provider, chainId).catch(
      makeCatchTransactionError(chainId, metricId, "gasPrice", additinalErrorContent)
    ),
    // simulation
    simulationPromise,
  ]);

  return { gasLimit, gasPriceData };
}

export const makeCatchTransactionError =
  (
    chainId: number,
    metricId: OrderMetricId | undefined,
    errorContext: OrderErrorContext,
    additinalErrorContent?: React.ReactNode
  ) =>
  (e: Error) => {
    if (metricId) {
      sendTxnErrorMetric(metricId, e, errorContext);
    }

    const { failMsg, autoCloseToast } = getTxnErrorToastContent(chainId, e, undefined, additinalErrorContent);
    helperToast.error(failMsg, { autoClose: autoCloseToast });

    throw e;
  };
