import { Address, encodePacked } from "viem";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { sleep } from "lib/sleep";

export type ExpressTxnData = {
  callData: string;
  to: string;
  feeToken: string;
  feeAmount: bigint;
};

export async function sendExpressTransaction(p: {
  chainId: number;
  txnData: ExpressTxnData;
  isSponsoredCall: boolean;
}) {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [p.txnData.callData as Address, p.txnData.to as Address, p.txnData.feeToken as Address, p.txnData.feeAmount]
  );

  let gelatoPromise: Promise<{ taskId: string }> | undefined;

  const apiKey = apiKeys[p.chainId];

  gelatoPromise = sendTxnToGelato({
    chainId: p.chainId,
    target: p.txnData.to,
    data,
    feeToken: p.txnData.feeToken,
    sponsorApiKey: apiKey,
    retries: 0,
    isSponsoredCall: p.isSponsoredCall,
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
    return new Promise<TransactionResult>((resolve, reject) => {
      pollGelatoTask(res.taskId, async (status, error) => {
        if (error) {
          reject(error);
          return;
        }

        if (!status) {
          reject(new Error("Gelato task status not found"));
          return;
        }

        const result: TransactionResult = {
          status: {
            taskId: res.taskId,
            taskState: status?.taskState,
            lastCheckMessage: status?.lastCheckMessage,
            creationDate: status?.creationDate,
            executionDate: status?.executionDate,
            chainId: status?.chainId,
          },
          receipt: status?.transactionHash
            ? {
                transactionHash: status.transactionHash,
                blockNumber: status.blockNumber!,
                status: status.taskState === "ExecSuccess" ? 1 : 0,
                gasUsed: status.gasUsed ? BigInt(status.gasUsed) : undefined,
                effectiveGasPrice: status.effectiveGasPrice ? BigInt(status.effectiveGasPrice) : undefined,
                chainId: status.chainId,
                timestamp: status.executionDate ? new Date(status.executionDate).getTime() : undefined,
              }
            : undefined,
        };

        switch (status?.taskState) {
          case "ExecSuccess":
          case "ExecReverted":
          case "Cancelled": {
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

const apiKeys = {
  [ARBITRUM]: "6dE6kOa9pc1ap4dQQC2iaK9i6nBFp8eYxQlm00VreWc_",
  [AVALANCHE]: "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_",
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
  sponsorApiKey: string;
  retries: number;
  isSponsoredCall: boolean;
}) {
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

  return res.json();
}

type TransactionResult = {
  status: {
    taskId: string;
    taskState: TaskState;
    lastCheckMessage?: string;
    creationDate: string;
    executionDate?: string;
    chainId: number;
  };
  receipt:
    | {
        transactionHash: string;
        blockNumber: number;
        status: number;
        gasUsed: bigint | undefined;
        effectiveGasPrice: bigint | undefined;
        chainId: number;
        timestamp: number | undefined;
      }
    | undefined;
};

export type GelatoTaskStatus = {
  chainId: number;
  taskId: string;
  taskState: TaskState;
  creationDate: string;
  lastCheckDate?: string;
  lastCheckMessage?: string;
  transactionHash?: string;
  blockNumber?: number;
  executionDate?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
};

export enum TaskState {
  CheckPending = "CheckPending",
  ExecPending = "ExecPending",
  WaitingForConfirmation = "WaitingForConfirmation",
  ExecSuccess = "ExecSuccess",
  ExecReverted = "ExecReverted",
  Cancelled = "Cancelled",
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

  while (attempts < maxAttempts) {
    try {
      const res = await fetch(`${GELATO_API}/tasks/status/${taskId}`);
      const { task: status } = await res.json();
      lastStatus = status;

      cb(status);

      if (finalStatuses.includes(status.taskState)) {
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
