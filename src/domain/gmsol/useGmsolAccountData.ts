import useSWR, { mutate } from "swr";

import { SOLANA_NETWORK_ID } from "config/chains";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { FeeDiscount } from "sdk/clients/v2";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

import { getGmsolApiCacheKey, getGmsolApiSdk } from "./api/gmsolApiSdk";
import {
  commitGmsolSnapshot,
  fetchGmsolOrders,
  fetchGmsolPositions,
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

const minContextSlotByOwner = new Map<string, number>();
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
  fetcher: (owner: string, apiCacheKey: string) => Promise<T>,
  refreshInterval = FREQUENT_UPDATE_INTERVAL
): GmsolAccountDataResult<T> {
  const key = owner ? getGmsolAccountDataKey(request, getGmsolApiCacheKey(), owner) : null;

  const { data, error, isLoading } = useSWR<T, Error>(
    key,
    ([, , keyApiCacheKey, keyOwner]: NonNullable<typeof key>) => fetcher(keyOwner, keyApiCacheKey),
    { refreshInterval }
  );

  return { data: key ? data : undefined, isLoading: key ? isLoading : false, error: key ? error : undefined };
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
  apiCacheKey,
  request,
  owner,
  readAtSlot,
  readCurrent,
}: {
  apiCacheKey: string;
  request: GmsolSlotRequest;
  owner: string;
  readAtSlot: (minContextSlot: number) => Promise<GmsolSlotted<T>>;
  readCurrent: () => Promise<GmsolSlotted<T>>;
}): Promise<T> {
  const key = `${apiCacheKey}:${request}:${owner}`;
  const minContextSlot = minContextSlotByOwner.get(owner);
  const acceptedSlot = acceptedGmsolSnapshots.get(key)?.slot;
  const requested =
    minContextSlot !== undefined && (acceptedSlot === undefined || acceptedSlot < minContextSlot)
      ? minContextSlot
      : undefined;

  const body =
    requested === undefined
      ? await readCurrent()
      : await readAtMinContextSlot(() => readAtSlot(requested), readCurrent);

  return takeGmsolSnapshot(key, body.slot, body.data);
}

function fetchPositions(owner: string, apiCacheKey: string) {
  const sdk = getGmsolApiSdk(apiCacheKey);
  return fetchAccountAtPendingSlot<ApiPositionInfo[]>({
    apiCacheKey,
    request: "gmsolPositions",
    owner,
    readAtSlot: (minContextSlot) => fetchGmsolPositions(sdk, owner, minContextSlot),
    readCurrent: () => fetchGmsolPositions(sdk, owner),
  });
}

function fetchOrders(owner: string, apiCacheKey: string) {
  const sdk = getGmsolApiSdk(apiCacheKey);
  return fetchAccountAtPendingSlot<ApiOrderInfo[]>({
    apiCacheKey,
    request: "gmsolOrders",
    owner,
    readAtSlot: (minContextSlot) => fetchGmsolOrders(sdk, owner, minContextSlot),
    readCurrent: () => fetchGmsolOrders(sdk, owner),
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
  return useGmsolAccountRequest<FeeDiscount>(
    "gmsolFeeDiscount",
    owner,
    (address, apiCacheKey) => getGmsolApiSdk(apiCacheKey).fetchFeeDiscount({ address }),
    FEE_DISCOUNT_REFRESH_INTERVAL
  );
}

// Each host and account read must catch up to the owner's latest confirmed transaction slot.
export async function refetchGmsolAccountDataAtSlot(owner: string, minContextSlot: number) {
  minContextSlotByOwner.set(owner, raisePendingMinContextSlot(minContextSlotByOwner.get(owner), minContextSlot));

  const apiCacheKey = getGmsolApiCacheKey();

  await Promise.all([
    mutate(getGmsolAccountDataKey("gmsolPositions", apiCacheKey, owner), fetchPositions(owner, apiCacheKey), {
      revalidate: false,
    }),
    mutate(getGmsolAccountDataKey("gmsolOrders", apiCacheKey, owner), fetchOrders(owner, apiCacheKey), {
      revalidate: false,
    }),
  ]);
}
