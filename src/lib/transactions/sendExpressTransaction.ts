import { StatusCode } from "@gelatocloud/gasless";
import { Address, encodePacked, type Hex } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, BOTANIX, ContractsChainId } from "config/chains";
import { GelatoPollingTiming, metrics } from "lib/metrics";
import { getGelatoRelayerClient } from "sdk/utils/gelatoRelay";

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

  const taskId = await relayer.sendTransaction({
    chainId: p.chainId,
    to: p.txnData.to as Address,
    data: data as Hex,
  });

  return {
    taskId,
    wait: makeExpressTxnResultWaiter(relayer, taskId),
  };
}

function makeExpressTxnResultWaiter(
  relayer: ReturnType<typeof getGelatoRelayerClient>,
  taskId: string
) {
  return async (): Promise<TransactionWaiterResult> => {
    const timerId = `pollGelatoTask ${taskId}`;
    metrics.startTimer(timerId);

    const terminalStatus = await relayer.waitForStatus({ id: taskId });

    metrics.pushTiming<GelatoPollingTiming>("express.pollGelatoTask.finalStatus", metrics.getTime(timerId) ?? 0, {
      status: String(terminalStatus.status),
    });

    if (terminalStatus.status === StatusCode.Success) {
      return {
        transactionHash: terminalStatus.receipt.transactionHash,
        blockNumber: Number(terminalStatus.receipt.blockNumber),
        status: "success",
        relayStatus: {
          taskId,
          statusCode: terminalStatus.status,
        },
      };
    }

    const transactionHash =
      terminalStatus.status === StatusCode.Reverted ? terminalStatus.receipt.transactionHash : undefined;

    return {
      transactionHash,
      blockNumber: undefined,
      status: "failed",
      relayStatus: {
        taskId,
        statusCode: terminalStatus.status,
        message: terminalStatus.message,
      },
    };
  };
}

const GELATO_API_KEYS: Partial<Record<ContractsChainId, string>> = {
  [ARBITRUM]: "6dE6kOa9pc1ap4dQQC2iaK9i6nBFp8eYxQlm00VreWc_",
  [AVALANCHE]: "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_",
  [BOTANIX]: "s5GgkfX7dvd_2uYqsRSCjzMekUrXh0dibUvfLab1Anc_",
  [ARBITRUM_SEPOLIA]: "nx5nyAg4h2kI_64YtOuPt7LSPDEXo4u8eJY_idF9xDw_",
};

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
