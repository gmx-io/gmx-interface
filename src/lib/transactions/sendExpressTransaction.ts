import { Address, encodePacked } from "viem";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { gelatoRelay } from "sdk/utils/gelatoRelay";

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

  if (p.isSponsoredCall) {
    const apiKeys = {
      [ARBITRUM]: "6dE6kOa9pc1ap4dQQC2iaK9i6nBFp8eYxQlm00VreWc_",
      [AVALANCHE]: "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_",
    };

    gelatoPromise = gelatoRelay.sponsoredCall(
      {
        chainId: BigInt(p.chainId),
        target: p.txnData.to,
        data,
      },
      apiKeys[p.chainId],
      {
        retries: 1,
      }
    );
  } else {
    gelatoPromise = gelatoRelay.callWithSyncFee(
      {
        chainId: BigInt(p.chainId),
        target: p.txnData.to,
        feeToken: p.txnData.feeToken,
        isRelayContext: true,
        data,
      },
      {
        retries: 1,
      }
    );
  }

  return gelatoPromise.then((res) => {
    return {
      taskId: res.taskId,
      wait: makeExpressTxnResultWaiter(res),
    };
  });
}

// TODO: Tests
function makeExpressTxnResultWaiter(res: { taskId: string }) {
  return async () => {
    const pollInterval = 500;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await gelatoRelay.getTaskStatus(res.taskId);

      const result = {
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
        case "Cancelled":
          return result;

        case "CheckPending":
        case "ExecPending":
        case "WaitingForConfirmation":
        default:
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;
          continue;
      }
    }

    const timeoutStatus = await gelatoRelay.getTaskStatus(res.taskId);
    const result = {
      status: {
        taskId: res.taskId,
        taskState: "Timeout",
        lastCheckMessage: "Transaction timeout - exceeded maximum wait time",
        creationDate: timeoutStatus?.creationDate,
        executionDate: timeoutStatus?.executionDate,
        chainId: timeoutStatus?.chainId,
      },
      receipt: timeoutStatus?.transactionHash
        ? {
            transactionHash: timeoutStatus.transactionHash,
            blockNumber: timeoutStatus.blockNumber!,
            status: 0,
            gasUsed: timeoutStatus.gasUsed ? BigInt(timeoutStatus.gasUsed) : undefined,
            effectiveGasPrice: timeoutStatus.effectiveGasPrice ? BigInt(timeoutStatus.effectiveGasPrice) : undefined,
            chainId: timeoutStatus.chainId,
            timestamp: timeoutStatus.executionDate ? new Date(timeoutStatus.executionDate).getTime() : undefined,
          }
        : undefined,
    };

    return result;
  };
}
