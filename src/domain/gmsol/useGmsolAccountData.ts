import useSWR, { mutate } from "swr";

import { SOLANA_NETWORK_ID } from "config/chains";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

import { fetchGmsolFeeDiscount, type GmsolFeeDiscount } from "./api/fetchGmsolFeeDiscount";
import { getGmsolApiCacheKey, getGmsolApiHttp } from "./api/gmsolApiSdk";
import {
  commitGmsolSnapshot,
  fetchGmsolOrders,
  fetchGmsolPositions,
  pendingMinContextSlotAfterRead,
  raisePendingMinContextSlot,
  readAtMinContextSlot,
  type GmsolSlotted,
} from "./api/refetchAtSlot";

// Positions are read from the Solana RPC on every request; 15 s fits the host's RPC budget.
const POSITIONS_REFRESH_INTERVAL = 15_000;
// Rank and referrer discounts move slowly. At 5 s the host answers 429 around 120 wallets.
const FEE_DISCOUNT_REFRESH_INTERVAL = 60_000;

type GmsolAccountRequest = "gmsolPositions" | "gmsolOrders" | "gmsolFeeDiscount";
type GmsolSlotRequest = Exclude<GmsolAccountRequest, "gmsolFeeDiscount">;

// Kept until a positions or orders response header reaches this slot. The two polls settle separately.
const pendingMinContextSlot = new Map<string, number>();
// Highest X-Solana-Slot accepted for this host, wallet and request. Older responses cannot replace it.
const acceptedGmsolSnapshots = new Map<string, { slot: number; data: unknown }>();

export function getGmsolAccountDataKey(request: GmsolAccountRequest, apiCacheKey: string, owner: string) {
  return [request, SOLANA_NETWORK_ID, apiCacheKey, owner] as const;
}

export type GmsolAccountDataResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

function useGmsolAccountRequest<T>(
  request: GmsolAccountRequest,
  owner: string | undefined,
  fetcher: (owner: string) => Promise<T>,
  refreshInterval = FREQUENT_UPDATE_INTERVAL
): GmsolAccountDataResult<T> {
  const key = owner ? getGmsolAccountDataKey(request, getGmsolApiCacheKey(), owner) : null;

  const { data, error, isLoading } = useSWR<T, Error>(
    key,
    ([, , , keyOwner]: NonNullable<typeof key>) => fetcher(keyOwner),
    { refreshInterval }
  );

  return { data: key ? data : undefined, isLoading: key ? isLoading : false, error: key ? error : undefined };
}

function pendingSlotKey(request: GmsolSlotRequest, owner: string) {
  return `${request}:${owner}`;
}

function rememberPendingSlot(request: GmsolSlotRequest, owner: string, slot: number) {
  const key = pendingSlotKey(request, owner);
  pendingMinContextSlot.set(key, raisePendingMinContextSlot(pendingMinContextSlot.get(key), slot));
}

function settlePendingSlot(request: GmsolSlotRequest, owner: string, requestedSlot: number, reachedSlot: boolean) {
  const key = pendingSlotKey(request, owner);
  const next = pendingMinContextSlotAfterRead({
    pending: pendingMinContextSlot.get(key),
    requestedSlot,
    reachedSlot,
  });
  if (next === undefined) {
    pendingMinContextSlot.delete(key);
  } else {
    pendingMinContextSlot.set(key, next);
  }
}

function takeGmsolSnapshot<T>(key: string, responseSlot: number | undefined, response: T): T {
  const previous = acceptedGmsolSnapshots.get(key) as { slot: number; data: T } | undefined;
  const next = commitGmsolSnapshot({
    acceptedSlot: previous?.slot,
    responseSlot,
    response,
    previous: previous?.data,
  });

  if (next.accepted && next.slot !== undefined) {
    acceptedGmsolSnapshots.set(key, { slot: next.slot, data: next.data });
  }

  return next.data;
}

async function fetchAccountAtPendingSlot<T>({
  request,
  owner,
  readAtSlot,
  readCurrent,
}: {
  request: GmsolSlotRequest;
  owner: string;
  readAtSlot: (minContextSlot: number) => Promise<GmsolSlotted<T>>;
  readCurrent: () => Promise<GmsolSlotted<T>>;
}): Promise<T> {
  const key = pendingSlotKey(request, owner);
  const requested = pendingMinContextSlot.get(key);

  const { data: body } =
    requested === undefined
      ? { data: await readCurrent() }
      : await readAtMinContextSlot(() => readAtSlot(requested), readCurrent);

  // The header is the snapshot's slot. A 200 below the pending floor does not clear it.
  if (requested !== undefined) {
    settlePendingSlot(request, owner, requested, body.slot !== undefined && body.slot >= requested);
  }

  return takeGmsolSnapshot(`${getGmsolApiCacheKey()}:${key}`, body.slot, body.data);
}

function fetchPositions(owner: string) {
  const api = getGmsolApiHttp();
  return fetchAccountAtPendingSlot<ApiPositionInfo[]>({
    request: "gmsolPositions",
    owner,
    readAtSlot: (minContextSlot) => fetchGmsolPositions(api, owner, minContextSlot),
    readCurrent: () => fetchGmsolPositions(api, owner),
  });
}

function fetchOrders(owner: string) {
  const api = getGmsolApiHttp();
  return fetchAccountAtPendingSlot<ApiOrderInfo[]>({
    request: "gmsolOrders",
    owner,
    readAtSlot: (minContextSlot) => fetchGmsolOrders(api, owner, minContextSlot),
    readCurrent: () => fetchGmsolOrders(api, owner),
  });
}

// `owner` is the Solana wallet from GMX's connect flow; without one nothing is requested.
export function useGmsolPositions(owner: string | undefined) {
  return useGmsolAccountRequest<ApiPositionInfo[]>("gmsolPositions", owner, fetchPositions, POSITIONS_REFRESH_INTERVAL);
}

export function useGmsolOrders(owner: string | undefined) {
  return useGmsolAccountRequest<ApiOrderInfo[]>("gmsolOrders", owner, fetchOrders);
}

export function useGmsolFeeDiscount(owner: string | undefined) {
  return useGmsolAccountRequest<GmsolFeeDiscount>(
    "gmsolFeeDiscount",
    owner,
    (address) => fetchGmsolFeeDiscount(getGmsolApiHttp(), address),
    FEE_DISCOUNT_REFRESH_INTERVAL
  );
}

// After the user's own transaction confirms, later polls keep asking for its slot until a response
// header reaches it. A header older than one already accepted is dropped. A 400, 503 or 429 falls
// back to the current response and clears the floor only when that header has reached the slot.
export async function refetchGmsolAccountDataAtSlot(owner: string, minContextSlot: number) {
  rememberPendingSlot("gmsolPositions", owner, minContextSlot);
  rememberPendingSlot("gmsolOrders", owner, minContextSlot);

  const apiCacheKey = getGmsolApiCacheKey();

  await Promise.all([
    mutate(getGmsolAccountDataKey("gmsolPositions", apiCacheKey, owner), fetchPositions(owner), { revalidate: false }),
    mutate(getGmsolAccountDataKey("gmsolOrders", apiCacheKey, owner), fetchOrders(owner), { revalidate: false }),
  ]);
}
