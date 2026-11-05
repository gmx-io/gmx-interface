import { ARBITRUM } from "config/chains";
import { GmxApiSdk } from "sdk/clients/v2";
import { buildUrl } from "sdk/utils/buildUrl/utils";
import { HttpError } from "sdk/utils/http/http";
import type { IHttp } from "sdk/utils/http/types";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

import { GMSOL_FIXTURE_HTTP_URL } from "./createGmsolFixtureHttp";

// 400 and 503: the host has not reached the slot. 429: the wallet is polling too fast.
// None of these is a failed read. The caller uses the current response and sends the slot again
// on the next regular poll.
const MIN_CONTEXT_SLOT_FALLBACK_STATUSES = new Set([400, 503, 429]);
const GMSOL_HTTP_TIMEOUT_MS = 30_000;
const SOLANA_SLOT_HEADER = "x-solana-slot";

export type GmsolSlotted<T> = { data: T; slot: number | undefined };

export function parseSolanaSlotHeader(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const slot = Number(value);
  if (!Number.isSafeInteger(slot) || slot < 0) {
    return undefined;
  }

  return slot;
}

// A later snapshot replaces the accepted one. An older slot, or a headerless body after a slotted one, does not.
export function commitGmsolSnapshot<T>({
  acceptedSlot,
  responseSlot,
  response,
  previous,
}: {
  acceptedSlot: number | undefined;
  responseSlot: number | undefined;
  response: T;
  previous: T | undefined;
}): { slot: number | undefined; data: T; accepted: boolean } {
  if (responseSlot !== undefined && (acceptedSlot === undefined || responseSlot >= acceptedSlot)) {
    return { slot: responseSlot, data: response, accepted: true };
  }

  if (previous !== undefined) {
    return { slot: acceptedSlot, data: previous, accepted: false };
  }

  return { slot: acceptedSlot, data: response, accepted: false };
}

export function isMinContextSlotFallback(error: unknown): boolean {
  return error instanceof HttpError && MIN_CONTEXT_SLOT_FALLBACK_STATUSES.has(error.statusCode);
}

// One attempt at the slot. A fallback status returns the current read and leaves the slot pending.
export async function readAtMinContextSlot<T>(
  readAtSlot: () => Promise<T>,
  readCurrent: () => Promise<T>
): Promise<{ data: T; reachedSlot: boolean }> {
  try {
    return { data: await readAtSlot(), reachedSlot: true };
  } catch (error) {
    if (!isMinContextSlotFallback(error)) {
      throw error;
    }
    return { data: await readCurrent(), reachedSlot: false };
  }
}

// A later transaction raises the slot. An older one must not move it backwards.
export function raisePendingMinContextSlot(pending: number | undefined, slot: number): number {
  return pending === undefined || slot > pending ? slot : pending;
}

// Clear the slot only when the read that just finished is the one still pending.
export function pendingMinContextSlotAfterRead({
  pending,
  requestedSlot,
  reachedSlot,
}: {
  pending: number | undefined;
  requestedSlot: number;
  reachedSlot: boolean;
}): number | undefined {
  if (reachedSlot && pending === requestedSlot) {
    return undefined;
  }
  return pending;
}

function definedQuery(query?: Record<string, any>) {
  if (!query) {
    return undefined;
  }

  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function throwGmsolHttpError(statusCode: number, statusText: string, body?: Record<string, any>): never {
  const message = typeof body?.message === "string" ? body.message : statusText;
  throw new HttpError(statusCode, `HTTP ${statusCode}: ${message}`, body);
}

// Fixture reads have no slot header. Live reads keep X-Solana-Slot, which HttpClient.fetchJson drops.
async function fetchGmsolJson<T>(api: IHttp, path: string, query?: Record<string, any>): Promise<GmsolSlotted<T>> {
  const params = definedQuery(query);

  if (api.url === GMSOL_FIXTURE_HTTP_URL) {
    return { data: await api.fetchJson<T>(path, { query: params }), slot: undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GMSOL_HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(api.url, path, params), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: Record<string, any> | undefined;
      try {
        body = await response.json();
      } catch {
        // The status is enough for the slot fallback.
      }
      throwGmsolHttpError(response.status, response.statusText, body);
    }

    return {
      data: (await response.json()) as T,
      slot: parseSolanaSlotHeader(response.headers.get(SOLANA_SLOT_HEADER)),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function gmsolReadHttp(api: IHttp, slotBox: { slot: number | undefined }, minContextSlot?: number): IHttp {
  return {
    url: api.url,
    postJson: (path, body, opts) => api.postJson(path, body, opts),
    fetchJson: async <TResult>(
      path: string,
      opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
    ) => {
      const query = minContextSlot === undefined ? opts?.query : { ...opts?.query, minContextSlot };
      const { data, slot } = await fetchGmsolJson(api, path, query);
      slotBox.slot = slot;
      return (opts?.transform ? opts.transform(data) : data) as TResult;
    },
  };
}

function readGmsolAccount<T>(
  api: IHttp,
  minContextSlot: number | undefined,
  read: (sdk: GmxApiSdk) => Promise<T>
): Promise<GmsolSlotted<T>> {
  const slotBox: { slot: number | undefined } = { slot: undefined };
  const sdk = new GmxApiSdk({ chainId: ARBITRUM, api: gmsolReadHttp(api, slotBox, minContextSlot) });
  return read(sdk).then((data) => ({ data, slot: slotBox.slot }));
}

export function fetchGmsolPositions(
  api: IHttp,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiPositionInfo[]>> {
  return readGmsolAccount(api, minContextSlot, (sdk) => sdk.fetchPositionsInfo({ address: owner }));
}

export function fetchGmsolOrders(
  api: IHttp,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiOrderInfo[]>> {
  return readGmsolAccount(api, minContextSlot, (sdk) => sdk.fetchOrders({ address: owner }));
}
