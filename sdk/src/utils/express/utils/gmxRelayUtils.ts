import { getApiUrl } from "configs/api";
import type { ContractsChainId } from "configs/chains";

import type { ExpressTxnData } from "../types";

export type GmxRelayStatus = "pending" | "executed" | "reverted" | "failed" | "unknown";

export type GmxRelayResult = {
  taskId: string;
  status: GmxRelayStatus;
};

export type GmxRelayStatusView = {
  taskId: string;
  status: GmxRelayStatus;
  txHash?: string;
  reason?: string;
};

export type GmxRelayTaskResult = {
  transactionHash?: string;
  status: "success" | "failed" | "pending";
  relayStatus: GmxRelayStatus;
  message?: string;
};

const SUBMIT_TIMEOUT_MS = 15_000;
const STATUS_TIMEOUT_MS = 10_000;
const WAIT_TIMEOUT_MS = 120_000;
const POLLING_INTERVAL_MS = 1_000;

export class GmxRelayError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "GmxRelayError";
  }

  /** A determinate rejection of this operation: retrying the same payload cannot succeed. */
  get isPermanent(): boolean {
    return this.httpStatus !== undefined && this.httpStatus >= 400 && this.httpStatus < 500 && this.httpStatus !== 429;
  }

  /** The relay could not take the operation; the caller should degrade to the classic flow. */
  get isRelayUnavailable(): boolean {
    return this.httpStatus === undefined || this.httpStatus >= 500;
  }
}

export function isPermanentRelayError(error: unknown): boolean {
  return error instanceof GmxRelayError && error.isPermanent;
}

export function isRelayUnavailableError(error: unknown): boolean {
  return error instanceof GmxRelayError && error.isRelayUnavailable;
}

export async function sendToGmxRelay({
  chainId,
  txnData,
  apiUrl,
}: {
  chainId: ContractsChainId;
  txnData: ExpressTxnData;
  apiUrl?: string;
}): Promise<GmxRelayResult> {
  // bare relay-router calldata: the fee is computed on-chain, so no Gelato fee suffix is appended
  const result = await post<GmxRelayResult>(
    resolveApiUrl(chainId, apiUrl),
    "/v1/relay/submit",
    { to: txnData.to, data: txnData.callData },
    SUBMIT_TIMEOUT_MS
  );

  if (!result.taskId) {
    throw new GmxRelayError("GMX Relay returned no taskId");
  }

  return result;
}

export function getGmxRelayTaskStatus({
  chainId,
  taskId,
  apiUrl,
}: {
  chainId: ContractsChainId;
  taskId: string;
  apiUrl?: string;
}): Promise<GmxRelayStatusView> {
  return post<GmxRelayStatusView>(resolveApiUrl(chainId, apiUrl), "/v1/relay/status", { taskId }, STATUS_TIMEOUT_MS);
}

export async function waitForGmxRelayTask({
  chainId,
  taskId,
  apiUrl,
  timeout = WAIT_TIMEOUT_MS,
  pollingInterval = POLLING_INTERVAL_MS,
}: {
  chainId: ContractsChainId;
  taskId: string;
  apiUrl?: string;
  timeout?: number;
  pollingInterval?: number;
}): Promise<GmxRelayTaskResult> {
  const deadline = Date.now() + timeout;

  for (;;) {
    const view = await getGmxRelayTaskStatus({ chainId, taskId, apiUrl });

    if (view.status !== "pending") {
      return {
        transactionHash: view.txHash,
        // `unknown` means the relay could not determine the outcome; report it as unresolved
        // rather than claiming success or failure
        status: view.status === "executed" ? "success" : view.status === "unknown" ? "pending" : "failed",
        relayStatus: view.status,
        message: view.reason,
      };
    }

    if (Date.now() + pollingInterval >= deadline) {
      return {
        transactionHash: view.txHash,
        status: "pending",
        relayStatus: view.status,
        message: "Timed out waiting for the relay operation to land",
      };
    }

    await sleep(pollingInterval);
  }
}

function resolveApiUrl(chainId: ContractsChainId, apiUrl?: string): string {
  const url = apiUrl ?? getApiUrl(chainId);

  if (!url) {
    throw new GmxRelayError(`GMX API url is not configured for chain ${chainId}`);
  }

  return url.replace(/\/$/, "");
}

async function post<T>(baseUrl: string, path: string, body: unknown, timeout: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new GmxRelayError(`GMX Relay request failed: ${e?.message ?? String(e)}`, undefined, e);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new GmxRelayError(
      `GMX Relay ${path} failed: ${extractMessage(text) ?? response.statusText}`,
      response.status
    );
  }

  return (await response.json()) as T;
}

function extractMessage(text: string): string | undefined {
  try {
    const parsed = JSON.parse(text);
    return parsed?.message ?? parsed?.error;
  } catch {
    return text || undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
