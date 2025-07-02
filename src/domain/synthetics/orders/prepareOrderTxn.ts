import { t } from "@lingui/macro";
import { ethers } from "ethers";

import { getGasLimit } from "lib/contracts";
import { OrderErrorContext } from "lib/errors";
import { getGasPrice } from "lib/gas/gasPrice";
import { helperToast } from "lib/helperToast";
import { OrderMetricId, sendTxnErrorMetric } from "lib/metrics";
import { getProvider } from "lib/rpc";

import { getErrorMessage } from "components/Errors/errorToasts";

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

  const provider = getProvider(undefined, chainId);
  const [gasLimit, gasPriceData] = await Promise.all([
    getGasLimit(contract, method, params, value).catch(
      makeCatchTransactionError(chainId, metricId, "gasLimit", additinalErrorContent)
    ),
    getGasPrice(provider, chainId).catch(
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

    const { failMsg, autoCloseToast } = getErrorMessage(chainId, e, undefined, additinalErrorContent);
    helperToast.error(failMsg, { autoClose: autoCloseToast });

    throw e;
  };
