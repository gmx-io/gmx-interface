import { t } from "@lingui/macro";
import { getIsFlagEnabled } from "config/ab";
import { ethers } from "ethers";
import { getGasLimit, getGasPrice } from "lib/contracts";
import { getErrorMessage } from "lib/contracts/transactionErrors";
import { helperToast } from "lib/helperToast";
import { OrderErrorContext, OrderMetricId, sendTxnErrorMetric } from "lib/metrics";

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
  metricId?: OrderMetricId
) {
  if (!getIsFlagEnabled("testParallelSimulation")) {
    await simulationPromise;
    return { gasLimit: undefined, gasPriceData: undefined };
  }

  if (!contract.runner?.provider) {
    helperToast.error(t`Error preparing transaction. Provider is not defined`);
    throw new Error("Provider is not defined");
  }

  const [gasLimit, gasPriceData] = await Promise.all([
    getGasLimit(contract, method, params, value).catch(makeCatchTransactionError(chainId, metricId, "gasLimit")),
    getGasPrice(contract.runner.provider, chainId).catch(makeCatchTransactionError(chainId, metricId, "gasPrice")),
    simulationPromise,
  ]);

  return { gasLimit, gasPriceData };
}

export const makeCatchTransactionError =
  (chainId: number, metricId: OrderMetricId | undefined, errorContext: OrderErrorContext) => (e: Error) => {
    if (metricId) {
      sendTxnErrorMetric(metricId, e, errorContext);
    }

    const { failMsg, autoCloseToast } = getErrorMessage(chainId, e);
    helperToast.error(failMsg, { autoClose: autoCloseToast });

    throw e;
  };
