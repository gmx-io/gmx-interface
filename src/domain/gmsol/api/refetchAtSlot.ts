import type { GmxApiSdk } from "sdk/clients/v2";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

export type GmsolSlotted<T> = { data: T; slot: number | undefined };

export function commitGmsolSnapshot<T>({
  requestedSlot,
  floor,
  responseSlot,
  response,
}: {
  requestedSlot: number | undefined;
  floor: number | undefined;
  responseSlot: number | undefined;
  response: T;
}): { slot: number; data: T } | undefined {
  if (responseSlot === undefined) {
    throw new Error("Missing or invalid X-Solana-Slot response header");
  }

  if (requestedSlot !== undefined && responseSlot < requestedSlot) {
    throw new Error("Solana response slot is older than the requested context slot");
  }

  return floor !== undefined && responseSlot < floor ? undefined : { slot: responseSlot, data: response };
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
  sdk: GmxApiSdk,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiPositionInfo[]>> {
  return readGmsolAccount((onResponse) => sdk.fetchPositionsInfo({ address: owner, minContextSlot, onResponse }));
}

export function fetchGmsolOrders(
  sdk: GmxApiSdk,
  owner: string,
  minContextSlot?: number
): Promise<GmsolSlotted<ApiOrderInfo[]>> {
  return readGmsolAccount((onResponse) => sdk.fetchOrders({ address: owner, minContextSlot, onResponse }));
}
