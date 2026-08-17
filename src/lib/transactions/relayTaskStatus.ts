import { TransactionRejectedError, TransactionRevertedError } from "@gelatocloud/gasless";

import { getUiApiUrl } from "config/api";
import { ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { RelayProvider } from "config/relay";
import { ErrorLike } from "lib/errors";
import { getTenderlyAccountParams } from "lib/tenderly";
import { GELATO_API_KEYS } from "sdk/configs/express";
import type { GmxRelayTaskResult } from "sdk/utils/express";
import { waitForGmxRelayTask } from "sdk/utils/express";
import { StatusCode, getGelatoRelayerClient } from "sdk/utils/gelatoRelay";

export type RelayTaskOutcome = {
  statusCode: StatusCode;
  transactionHash?: string;
  message?: string;
  revertData?: string;
};

export function getGmxRelayStatusCode(result: Pick<GmxRelayTaskResult, "status" | "relayStatus">): StatusCode {
  if (result.status === "success") {
    return StatusCode.Success;
  }

  return result.relayStatus === "reverted" ? StatusCode.Reverted : StatusCode.Rejected;
}

/** Never rejects: `undefined` means the relay reached no determinate outcome and on-chain events must judge the operation. */
export async function waitForRelayTaskOutcome({
  chainId,
  taskId,
  relayProvider,
}: {
  chainId: ContractsChainId;
  taskId: string;
  relayProvider: RelayProvider;
}): Promise<RelayTaskOutcome | undefined> {
  if (relayProvider === "gmx") {
    return waitForGmxRelayTaskOutcome({ chainId, taskId });
  }

  return waitForGelatoTaskOutcome({ chainId, taskId });
}

async function waitForGmxRelayTaskOutcome({
  chainId,
  taskId,
}: {
  chainId: ContractsChainId;
  taskId: string;
}): Promise<RelayTaskOutcome | undefined> {
  let result: GmxRelayTaskResult;

  try {
    result = await waitForGmxRelayTask({ chainId, taskId, apiUrl: getUiApiUrl(chainId) });
  } catch (error) {
    // a determinate refusal of the status request: the relay will never report a verdict for this
    // task. Returning an outcome (rather than a metric here plus a synthesized one upstream) keeps
    // exactly one failure event per operation — the A/B compares failure counts across providers
    const message = (error as ErrorLike)?.message ?? String(error);
    const traceId = (error as ErrorLike)?.data?.traceId;

    return {
      statusCode: StatusCode.Rejected,
      message: traceId ? `${message} (traceId: ${traceId})` : message,
    };
  }

  if (result.status === "pending") {
    return undefined;
  }

  return {
    statusCode: getGmxRelayStatusCode(result),
    transactionHash: result.transactionHash,
    message: result.message,
  };
}

async function waitForGelatoTaskOutcome({
  chainId,
  taskId,
}: {
  chainId: ContractsChainId;
  taskId: string;
}): Promise<RelayTaskOutcome | undefined> {
  const relayer = getGelatoRelayerForChain(chainId);

  if (!relayer) {
    return undefined;
  }

  try {
    const receipt = await relayer.waitForReceipt({
      id: taskId,
      timeout: 120_000,
      pollingInterval: 1_000,
      throwOnReverted: true,
    });

    logGelatoTaskDebugInfo(taskId, "gelatoDebugData", receipt);

    return {
      statusCode: StatusCode.Success,
      transactionHash: receipt.transactionHash,
    };
  } catch (e) {
    if (e instanceof TransactionRevertedError) {
      logGelatoTaskDebugInfo(taskId, "gelatoDebugData reverted", e);

      return {
        statusCode: StatusCode.Reverted,
        message: e.errorMessage,
        transactionHash: e.receipt.transactionHash,
        revertData: typeof e.errorData === "string" ? e.errorData : undefined,
      };
    }

    if (e instanceof TransactionRejectedError) {
      return {
        statusCode: StatusCode.Rejected,
        message: e.errorMessage,
      };
    }

    // eslint-disable-next-line no-console
    console.error(e);

    return {
      statusCode: StatusCode.Rejected,
      message: e instanceof Error ? e.message : "Task status polling failed",
    };
  }
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

function logGelatoTaskDebugInfo(taskId: string, label: string, payload: unknown) {
  if (!isDevelopment()) {
    return;
  }

  const { accountSlug, projectSlug } = getTenderlyAccountParams();

  getGelatoTaskDebugInfo(taskId, accountSlug, projectSlug).then((debugInfo) =>
    // eslint-disable-next-line no-console
    console.log(label, payload, debugInfo)
  );
}
