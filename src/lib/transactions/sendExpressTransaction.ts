import { TransactionRevertedError, TransactionRejectedError, SimulationFailedRpcError } from "@gelatocloud/gasless";
import { Address, encodePacked, type Hex } from "viem";

import { ContractsChainId } from "config/chains";
import { GelatoPollingTiming, metrics } from "lib/metrics";
import { GELATO_API_KEYS } from "sdk/configs/express";
import { StatusCode, getGelatoRelayerClient } from "sdk/utils/gelatoRelay";

import type { TransactionWaiterResult } from "./types";

export type ExpressTxnData = {
  callData: string;
  to: string;
  feeToken: string;
  feeAmount: bigint;
};

export type ExpressTxnResult = {
  taskId: string;
  wait: () => Promise<TransactionWaiterResult>;
};

export async function sendExpressTransaction(p: {
  chainId: ContractsChainId;
  txnData: ExpressTxnData;
}): Promise<ExpressTxnResult> {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [p.txnData.callData as Address, p.txnData.to as Address, p.txnData.feeToken as Address, p.txnData.feeAmount]
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
      to: p.txnData.to as Address,
      data: data as Hex,
    });
  } catch (error) {
    if (error instanceof SimulationFailedRpcError) {
      throw new Error(`data="${error.revertData}"`);
    }
    throw error;
  }

  return {
    taskId,
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
        usePolling: true,
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

export function getGelatoRelayerForChain(chainId: number) {
  const apiKey = GELATO_API_KEYS[chainId as ContractsChainId];
  if (!apiKey) return undefined;
  return getGelatoRelayerClient(apiKey);
}

const GELATO_API = "https://api.gelato.digital";

export async function getGelatoTaskDebugInfo(taskId: string, accountSlug?: string, projectSlug?: string) {
  const accountParams =
    accountSlug && projectSlug ? `?tenderlyUsername=${accountSlug}&tenderlyProjectName=${projectSlug}` : "";

  try {
    const res = await fetch(`${GELATO_API}/tasks/status/${taskId}/debug${accountParams}`);
    const debugData = await res.json();
    return debugData;
  } catch (error) {
    return undefined;
  }
}
