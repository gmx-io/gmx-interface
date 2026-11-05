import type { SolanaNetworkId } from "config/chains";
import type { GmxApiSdk } from "sdk/clients/v2";
import { HttpError } from "sdk/utils/http/http";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

// 400 and 503: the host has not reached the slot. 429: the wallet is polling too fast.
// None of these is a failed read. The caller uses the current response and sends the slot again
// on the next regular poll.
const MIN_CONTEXT_SLOT_FALLBACK_STATUSES = new Set([400, 503, 429]);

export type GmsolSlotted<T> = { data: T; slot: number | undefined };

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
export async function readAtMinContextSlot<T>(readAtSlot: () => Promise<T>, readCurrent: () => Promise<T>): Promise<T> {
  try {
    return await readAtSlot();
  } catch (error) {
    if (!isMinContextSlotFallback(error)) {
      throw error;
    }
    return readCurrent();
  }
}

// A later transaction raises the slot. An older one must not move it backwards.
export function raisePendingMinContextSlot(pending: number | undefined, slot: number): number {
  return pending === undefined || slot > pending ? slot : pending;
}

async function readGmsolAccount<T>(
  read: (onResponse: (metadata: { slot: number | undefined }) => void) => Promise<T>
): Promise<GmsolSlotted<T>> {
  let slot: number | undefined;
  const data = await read((metadata) => {
    slot = metadata.slot;
  });
  return { data, slot };
}

export function fetchGmsolPositions(
  sdk: GmxApiSdk<SolanaNetworkId>,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiPositionInfo[]>> {
  return readGmsolAccount((onResponse) => sdk.fetchPositionsInfo({ address: owner, minContextSlot, onResponse }));
}

export function fetchGmsolOrders(
  sdk: GmxApiSdk<SolanaNetworkId>,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiOrderInfo[]>> {
  return readGmsolAccount((onResponse) => sdk.fetchOrders({ address: owner, minContextSlot, onResponse }));
}
