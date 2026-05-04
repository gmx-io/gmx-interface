import { TransactionRevertedError, TransactionRejectedError } from "@gelatocloud/gasless";
import { encodePacked } from "viem";

import type { ContractsChainId } from "configs/chains";
import { GELATO_API_KEYS } from "configs/express";
import { getGelatoRelayerClient, type GelatoEvmRelayerClient, StatusCode } from "utils/gelatoRelay/utils";

import type { ExpressTxnData } from "../types";

export class GelatoRelayError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "GelatoRelayError";
  }
}

export type GelatoRelayResult = {
  taskId: string;
  relayerClient: GelatoEvmRelayerClient;
};

export async function sendToGelatoRelay({
  chainId,
  txnData,
}: {
  chainId: ContractsChainId;
  txnData: ExpressTxnData;
}): Promise<GelatoRelayResult> {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [txnData.callData, txnData.to, txnData.feeToken, txnData.feeAmount]
  );

  const apiKey = GELATO_API_KEYS[chainId];

  if (!apiKey) {
    throw new GelatoRelayError(`Gelato API key not configured for chain ${chainId}`);
  }

  const relayerClient = getGelatoRelayerClient(apiKey);

  let taskId: string;
  try {
    taskId = await relayerClient.sendTransaction({
      chainId,
      to: txnData.to,
      data,
    });
  } catch (e: any) {
    throw new GelatoRelayError(`Gelato relay failed: ${e?.message ?? String(e)}`, e);
  }

  if (!taskId) {
    throw new GelatoRelayError("Gelato relay returned no taskId");
  }

  return { taskId, relayerClient };
}

export async function waitForGelatoTask(
  relayerClient: GelatoEvmRelayerClient,
  taskId: string,
  options?: { timeout?: number; pollingInterval?: number }
): Promise<{
  transactionHash?: string;
  blockNumber?: number;
  status: "success" | "failed";
  statusCode: number;
  message?: string;
}> {
  try {
    const receipt = await relayerClient.waitForReceipt({
      id: taskId,
      timeout: options?.timeout ?? 120_000,
      pollingInterval: options?.pollingInterval ?? 1_000,
      throwOnReverted: true,
    });

    return {
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
      status: "success",
      statusCode: StatusCode.Success,
    };
  } catch (error) {
    if (error instanceof TransactionRevertedError) {
      return {
        transactionHash: error.receipt.transactionHash,
        blockNumber: undefined,
        status: "failed",
        statusCode: StatusCode.Reverted,
        message: error.errorMessage,
      };
    }

    if (error instanceof TransactionRejectedError) {
      return {
        transactionHash: undefined,
        blockNumber: undefined,
        status: "failed",
        statusCode: StatusCode.Rejected,
        message: error.errorMessage,
      };
    }

    throw error;
  }
}
