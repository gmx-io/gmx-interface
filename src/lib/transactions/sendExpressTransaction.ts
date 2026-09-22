import { getUiApiUrl } from "config/api";
import { ContractsChainId } from "config/chains";
import { GmxRelayPollingTiming, metrics } from "lib/metrics";
import type { ExpressTxnData } from "sdk/utils/express";
import { sendToGmxRelay, waitForGmxRelayTask } from "sdk/utils/express";

import { getGmxRelayStatusCode } from "./relayTaskStatus";
import type { TransactionWaiterResult } from "./types";

export type { ExpressTxnData } from "sdk/utils/express";

export type ExpressTxnResult = {
  taskId: string;
  wait: () => Promise<TransactionWaiterResult>;
};

export async function sendExpressTransaction(p: {
  chainId: ContractsChainId;
  txnData: ExpressTxnData;
}): Promise<ExpressTxnResult> {
  // without an explicit url the SDK falls back to production; a session on the test API must not broadcast through prod
  const apiUrl = getUiApiUrl(p.chainId);

  if (!apiUrl) {
    throw new Error(`No GMX API is configured for chain ${p.chainId} in this environment.`);
  }

  const { taskId } = await sendToGmxRelay({ chainId: p.chainId, txnData: p.txnData, apiUrl });

  return {
    taskId,
    wait: makeExpressResultWaiter(p.chainId, taskId, apiUrl),
  };
}

function makeExpressResultWaiter(chainId: ContractsChainId, taskId: string, apiUrl: string | undefined) {
  return async (): Promise<TransactionWaiterResult> => {
    const timerId = `pollRelayTask ${taskId}`;
    metrics.startTimer(timerId);

    const result = await waitForGmxRelayTask({ chainId, taskId, apiUrl });

    if (result.status === "pending") {
      throw new Error(`Relay task ${taskId} did not resolve: ${result.message ?? result.relayStatus}`);
    }

    const statusCode = getGmxRelayStatusCode(result);

    metrics.pushTiming<GmxRelayPollingTiming>("express.pollRelayTask.finalStatus", metrics.getTime(timerId) ?? 0, {
      status: String(statusCode),
    });

    return {
      transactionHash: result.transactionHash,
      blockNumber: undefined,
      status: result.status,
      relayStatus: {
        taskId,
        statusCode,
        message: result.message,
      },
    };
  };
}
