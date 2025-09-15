import { TaskState } from "@gelatonetwork/relay-sdk";
import { Address, encodePacked } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, BOTANIX, ContractsChainId } from "config/chains";
import { GelatoPollingTiming, metrics } from "lib/metrics";
import { sleep } from "lib/sleep";
import { gelatoRelay } from "sdk/utils/gelatoRelay";

import type { GelatoTaskStatus, TransactionWaiterResult } from "./types";

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
  isSponsoredCall: boolean;
}) {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [p.txnData.callData as Address, p.txnData.to as Address, p.txnData.feeToken as Address, p.txnData.feeAmount]
  );

  let gelatoPromise: Promise<{ taskId: string }> | undefined;

  const apiKey = GELATO_API_KEYS[p.chainId];

  gelatoPromise = sendTxnToGelato({
    chainId: p.chainId,
    target: p.txnData.to,
    data,
    feeToken: p.txnData.feeToken,
    sponsorApiKey: apiKey,
    retries: 0,
    isSponsoredCall: apiKey ? p.isSponsoredCall : false,
  });

  return gelatoPromise.then((res) => {
    return {
      taskId: res.taskId,
      wait: makeExpressTxnResultWaiter(res),
    };
  });
}

function makeExpressTxnResultWaiter(res: { taskId: string }) {
  return async () => {
    return new Promise<TransactionWaiterResult>((resolve, reject) => {
      pollGelatoTask(res.taskId, async (status, error) => {
        if (error) {
          reject(error);
          return;
        }

        switch (status?.taskState) {
          case "ExecSuccess":
          case "ExecReverted":
          case "Cancelled": {
            const result: TransactionWaiterResult = {
              transactionHash: status.transactionHash,
              blockNumber: status?.blockNumber,
              status: status.taskState === "ExecSuccess" ? "success" : "failed",
              relayStatus: {
                taskId: res.taskId,
                taskState: status.taskState,
              },
            };
            resolve(result);
            break;
          }
          case "CheckPending":
          case "ExecPending":
          case "WaitingForConfirmation":
          default:
            break;
        }
      });
    });
  };
}

const GELATO_API = "https://api.gelato.digital";

export const GELATO_API_KEYS: Partial<Record<ContractsChainId, string>> = {
  [ARBITRUM]: "6dE6kOa9pc1ap4dQQC2iaK9i6nBFp8eYxQlm00VreWc_",
  [AVALANCHE]: "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_",
  [BOTANIX]: "s5GgkfX7dvd_2uYqsRSCjzMekUrXh0dibUvfLab1Anc_",
  [ARBITRUM_SEPOLIA]: "nx5nyAg4h2kI_64YtOuPt7LSPDEXo4u8eJY_idF9xDw_",
};

export async function sendTxnToGelato({
  chainId,
  target,
  data,
  feeToken,
  sponsorApiKey,
  retries,
  isSponsoredCall,
}: {
  chainId: number;
  target: string;
  data: string;
  feeToken: string;
  sponsorApiKey: string | undefined;
  retries: number;
  isSponsoredCall: boolean;
}) {
  if (isSponsoredCall && !sponsorApiKey) {
    throw new Error("Sponsor API key is required for sponsored call");
  }

  const url = isSponsoredCall ? `${GELATO_API}/relays/v2/sponsored-call` : `${GELATO_API}/relays/v2/call-with-sync-fee`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      target,
      data,
      feeToken,
      sponsorApiKey,
      retries,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to call with sync fee: ${res.statusText}`);
  }

  const result = await res.json();

  gelatoRelay.subscribeTaskStatusUpdate(result.taskId);

  return result;
}

const finalStatuses = [TaskState.ExecSuccess, TaskState.ExecReverted, TaskState.Cancelled];

export async function pollGelatoTask(
  taskId: string,
  cb: (status: GelatoTaskStatus | undefined, error?: Error) => void
) {
  const pollInterval = 500;
  const maxAttempts = 60;

  let attempts = 0;
  let lastStatus: GelatoTaskStatus | undefined;

  const timerId = `pollGelatoTask ${taskId}`;
  metrics.startTimer(timerId);

  while (attempts < maxAttempts) {
    try {
      const res = await fetch(`${GELATO_API}/tasks/status/${taskId}`);
      const { task: status } = await res.json();
      lastStatus = status;

      cb(status);

      if (finalStatuses.includes(status.taskState)) {
        metrics.pushTiming<GelatoPollingTiming>("express.pollGelatoTask.finalStatus", metrics.getTime(timerId) ?? 0, {
          status: status.taskState,
        });
        return;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      await sleep(pollInterval);
      attempts++;
    }
  }

  cb(lastStatus, new Error("Gelato Task timeout"));
}

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
