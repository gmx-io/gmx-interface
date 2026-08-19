import { getApiUrl } from "configs/api";
import type { ContractsChainId } from "configs/chains";
import { buildUrl } from "utils/buildUrl";
import { sleep } from "utils/common";
import { HttpError } from "utils/http/http";

import type { ExpressTxnData } from "../types";

export type GmxRelayStatus = "pending" | "executed" | "reverted" | "failed" | "unknown";

export type GmxRelayResult = {
  taskId: string;
  status: GmxRelayStatus;
};

export type GmxRelayDebugView = {
  chainId?: number;
  from?: string | null;
  to?: string;
  operationType?: string;
  account?: string;
  blockNumber?: number | null;
  errorCode?: string | null;
  errorData?: string | null;
  calldata?: string;
  tenderlyUrl?: string;
};

export type GmxRelayStatusView = {
  taskId: string;
  status: GmxRelayStatus;
  txHash?: string;
  reason?: string;
  revertData?: string;
  debug?: GmxRelayDebugView | null;
};

export type GmxRelayTaskResult = {
  transactionHash?: string;
  status: "success" | "failed" | "pending";
  relayStatus: GmxRelayStatus;
  message?: string;
  revertData?: string;
};

const SUBMIT_TIMEOUT_MS = 15_000;
const STATUS_TIMEOUT_MS = 10_000;
const WAIT_TIMEOUT_MS = 120_000;
const POLLING_INTERVAL_MS = 1_000;

export class GmxRelayError extends HttpError {
  data?: { traceId: string };

  constructor(
    message: string,
    httpStatus?: number,
    public readonly cause?: unknown
  ) {
    // statusCode 0 marks a transport failure that never got an HTTP answer
    super(httpStatus ?? 0, message);
    this.name = "GmxRelayError";
  }

  get isPermanent(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500 && this.statusCode !== 429;
  }
}

export function isPermanentRelayError(error: unknown): boolean {
  return error instanceof GmxRelayError && error.isPermanent;
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let view: GmxRelayStatusView;

    try {
      view = await getGmxRelayTaskStatus({ chainId, taskId, apiUrl });
    } catch (e) {
      // a 404 is transient here: the task can be accepted a moment before its status becomes readable
      const error = e instanceof GmxRelayError ? e : new GmxRelayError(String(e));

      if (error.isPermanent && error.statusCode !== 404) {
        throw error;
      }

      if (Date.now() + pollingInterval >= deadline) {
        return {
          transactionHash: undefined,
          status: "pending",
          relayStatus: "unknown",
          message: `Could not read the relay operation's status: ${error.message}`,
        };
      }

      await sleep(pollingInterval);
      continue;
    }

    if (view.status !== "pending") {
      return {
        transactionHash: view.txHash,
        // relay `unknown` means it could not determine the outcome, so it must not map to failure
        status: view.status === "executed" ? "success" : view.status === "unknown" ? "pending" : "failed",
        relayStatus: view.status,
        message: view.reason,
        revertData: view.revertData,
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

  return url;
}

async function post<T>(baseUrl: string, path: string, body: unknown, timeout: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  // bespoke fetch rather than postJson: the trace id arrives in a response header on refusals,
  // and the shared client only surfaces parsed bodies
  // the timer must also cover the body read: a response that stalls after its headers would hang forever
  try {
    const response = await fetch(buildUrl(baseUrl, path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = new GmxRelayError(
        `GMX Relay ${path} failed: ${extractMessage(text) ?? response.statusText}`,
        response.status
      );

      // a request refused before it was relayed never gets a taskId; the trace id is the only handle left
      const traceId = response.headers.get("X-Trace-Id");
      if (traceId) {
        error.traceId = traceId;
        error.data = { traceId };
      }

      throw error;
    }

    try {
      return (await response.json()) as T;
    } catch (e: any) {
      throw new GmxRelayError(`GMX Relay ${path} returned an unreadable body`, response.status, e);
    }
  } catch (e: any) {
    if (e instanceof GmxRelayError) {
      throw e;
    }

    throw new GmxRelayError(`GMX Relay request failed: ${e?.message ?? String(e)}`, undefined, e);
  } finally {
    clearTimeout(timer);
  }
}

function extractMessage(text: string): string | undefined {
  try {
    const parsed = JSON.parse(text);
    return parsed?.message ?? parsed?.error;
  } catch {
    // a non-JSON body is an edge's HTML error page, not a message to surface to a user
    return undefined;
  }
}
