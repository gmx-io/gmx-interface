import { TransactionRevertedError, TransactionRejectedError, SimulationFailedRpcError } from "@gelatocloud/gasless";
import { encodePacked } from "viem";

import { getUiApiUrl } from "config/api";
import { ContractsChainId } from "config/chains";
import { RelayProvider, getRelayProviderForSubmit } from "config/relay";
import { GelatoPollingTiming, GmxRelayPollingTiming, metrics } from "lib/metrics";
import { GELATO_API_KEYS } from "sdk/configs/express";
import type { ExpressTxnData } from "sdk/utils/express";
import { sendToGmxRelay, waitForGmxRelayTask } from "sdk/utils/express";
import { StatusCode, getGelatoRelayerClient } from "sdk/utils/gelatoRelay";

import { getGmxRelayStatusCode } from "./relayTaskStatus";
import type { TransactionWaiterResult } from "./types";

export type { ExpressTxnData } from "sdk/utils/express";

export type ExpressTxnResult = {
  taskId: string;
  relayProvider: RelayProvider;
  wait: () => Promise<TransactionWaiterResult>;
};

export async function sendExpressTransaction(p: {
  chainId: ContractsChainId;
  txnData: ExpressTxnData;
}): Promise<ExpressTxnResult> {
  if (getRelayProviderForSubmit(p.chainId) === "gmx") {
    return sendViaGmxRelay(p);
  }

  return sendViaGelato(p);
}

async function sendViaGmxRelay(p: { chainId: ContractsChainId; txnData: ExpressTxnData }): Promise<ExpressTxnResult> {
  // without an explicit url the SDK falls back to production; a session on the test API must not broadcast through prod
  const apiUrl = getUiApiUrl(p.chainId);

  if (!apiUrl) {
    throw new Error(`No GMX API is configured for chain ${p.chainId} in this environment.`);
  }

  const { taskId } = await sendToGmxRelay({ chainId: p.chainId, txnData: p.txnData, apiUrl });

  return {
    taskId,
    relayProvider: "gmx",
    wait: makeGmxRelayResultWaiter(p.chainId, taskId, apiUrl),
  };
}

function makeGmxRelayResultWaiter(chainId: ContractsChainId, taskId: string, apiUrl: string | undefined) {
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

async function sendViaGelato(p: { chainId: ContractsChainId; txnData: ExpressTxnData }): Promise<ExpressTxnResult> {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [p.txnData.callData, p.txnData.to, p.txnData.feeToken, p.txnData.feeAmount]
  );

  const apiKey = GELATO_API_KEYS[p.chainId];

  if (!apiKey) {
    throw new Error("Sponsor API key is required for sponsored call");
  }

  const relayer = getGelatoRelayerClient(apiKey);

  let taskId: string;

  try {
    taskId = await relayer.sendTransaction({
      chainId: p.chainId,
      to: p.txnData.to,
      data,
    });
  } catch (error) {
    if (error instanceof SimulationFailedRpcError) {
      throw new Error(`data="${error.revertData}"`);
    }
    throw error;
  }

  return {
    taskId,
    relayProvider: "gelato",
    wait: makeExpressTxnResultWaiter(relayer, taskId),
  };
}

function makeExpressTxnResultWaiter(relayer: ReturnType<typeof getGelatoRelayerClient>, taskId: string) {
  return async (): Promise<TransactionWaiterResult> => {
    const timerId = `pollGelatoTask ${taskId}`;
    metrics.startTimer(timerId);

    try {
      const receipt = await relayer.waitForReceipt({
        id: taskId,
        timeout: 120_000,
        pollingInterval: 1_000,
        throwOnReverted: true,
      });

      metrics.pushTiming<GelatoPollingTiming>("express.pollGelatoTask.finalStatus", metrics.getTime(timerId) ?? 0, {
        status: String(StatusCode.Success),
      });

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        status: "success",
        relayStatus: {
          taskId,
          statusCode: StatusCode.Success,
        },
      };
    } catch (error) {
      if (error instanceof TransactionRevertedError) {
        metrics.pushTiming<GelatoPollingTiming>("express.pollGelatoTask.finalStatus", metrics.getTime(timerId) ?? 0, {
          status: String(StatusCode.Reverted),
        });

        return {
          transactionHash: error.receipt.transactionHash,
          blockNumber: undefined,
          status: "failed",
          relayStatus: {
            taskId,
            statusCode: StatusCode.Reverted,
            message: error.errorMessage,
          },
        };
      }

      if (error instanceof TransactionRejectedError) {
        metrics.pushTiming<GelatoPollingTiming>("express.pollGelatoTask.finalStatus", metrics.getTime(timerId) ?? 0, {
          status: String(StatusCode.Rejected),
        });

        return {
          transactionHash: undefined,
          blockNumber: undefined,
          status: "failed",
          relayStatus: {
            taskId,
            statusCode: StatusCode.Rejected,
            message: error.errorMessage,
          },
        };
      }

      throw error;
    }
  };
}
