import type { GmxApiSdk } from "sdk/clients/v2";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

export type GmsolSlotted<T> = { data: T; slot: number | undefined };

// A later snapshot replaces the accepted one. An older slot does not.
// A 200 without X-Solana-Slot is the current read: keeping the previous body would freeze the list.
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
  if (responseSlot === undefined) {
    return { slot: acceptedSlot, data: response, accepted: true };
  }

  if (acceptedSlot === undefined || responseSlot >= acceptedSlot) {
    return { slot: responseSlot, data: response, accepted: true };
  }

  if (previous !== undefined) {
    return { slot: acceptedSlot, data: previous, accepted: false };
  }

  return { slot: acceptedSlot, data: response, accepted: false };
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
