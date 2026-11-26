import { useMemo, useSyncExternalStore } from "react";
import { mutate } from "swr";

import { getUiApiCacheKey } from "config/api";
import { SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { API_STALE_MS, mutateSWRWithFreshness, useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { FeeDiscount, GmxApiSdk } from "sdk/clients/v2";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

import { GmsolAccountSlotTracker } from "./api/GmsolAccountSlotTracker";
import { fetchGmsolOrders, fetchGmsolPositions } from "./api/refetchAtSlot";

const POSITIONS_REFRESH_INTERVAL = 15_000;
// Rank and referrer discounts move slowly. At 5 s the host answers 429 around 120 wallets.
const FEE_DISCOUNT_REFRESH_INTERVAL = 60_000;

type GmsolAccountRequest = "gmsolPositions" | "gmsolOrders" | "gmsolFeeDiscount";

const accountSlots = new GmsolAccountSlotTracker();
const subscribeToAccountSlots = (listener: () => void) => accountSlots.subscribe(listener);

function getAccountSlotKey(request: GmsolAccountRequest, apiCacheKey: string, owner: string) {
  return `${apiCacheKey}:${request}:${owner}`;
}

export function getGmsolAccountDataKey(request: GmsolAccountRequest, apiCacheKey: string, owner: string) {
  return [request, SOLANA_NETWORK_ID, apiCacheKey, owner] as const;
}

export type GmsolAccountDataResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | undefined;
};

function useGmsolAccountRequest<T>(
  request: GmsolAccountRequest,
  owner: string | undefined,
  fetcher: (sdk: GmxApiSdk, owner: string, apiCacheKey: string) => Promise<T>,
  refreshInterval = FREQUENT_UPDATE_INTERVAL
): GmsolAccountDataResult<T> {
  const apiCacheKey = getUiApiCacheKey(SOLANA_NETWORK_ID);
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const key = owner && sdk ? getGmsolAccountDataKey(request, apiCacheKey, owner) : null;
  const slotKey = owner ? getAccountSlotKey(request, apiCacheKey, owner) : undefined;
  const isPendingConfirmation = useSyncExternalStore(subscribeToAccountSlots, () => accountSlots.isPending(slotKey));
  const refreshError = useSyncExternalStore(subscribeToAccountSlots, () => accountSlots.getError(slotKey));

  const { data, error, isLoading, freshness } = useSWRWithFreshness<T>(
    key,
    ([, , keyApiCacheKey, keyOwner]: NonNullable<typeof key>) => fetcher(sdk!, keyOwner, keyApiCacheKey),
    { refreshInterval, maxAgeMs: refreshInterval + API_STALE_MS }
  );
  const isOverdue = freshness.isStale && !error && !isPendingConfirmation;
  const overdueError = useMemo(
    () => (isOverdue ? new Error(`${request} has not refreshed within its grace period`) : undefined),
    [isOverdue, request]
  );

  return {
    data: key ? data : undefined,
    isLoading: key ? isLoading : false,
    isSyncing: Boolean(key && isPendingConfirmation),
    error: key ? error ?? refreshError ?? overdueError : undefined,
  };
}

function fetchPositions(sdk: GmxApiSdk, owner: string, apiCacheKey: string) {
  return accountSlots.read(getAccountSlotKey("gmsolPositions", apiCacheKey, owner), (minContextSlot) =>
    fetchGmsolPositions(sdk, owner, minContextSlot)
  );
}

function fetchOrders(sdk: GmxApiSdk, owner: string, apiCacheKey: string) {
  return accountSlots.read(getAccountSlotKey("gmsolOrders", apiCacheKey, owner), (minContextSlot) =>
    fetchGmsolOrders(sdk, owner, minContextSlot)
  );
}

export async function refreshGmsolAccountDataAfterTransaction(sdk: GmxApiSdk, owner: string, slot: number) {
  const apiCacheKey = getUiApiCacheKey(SOLANA_NETWORK_ID);
  for (const request of ["gmsolPositions", "gmsolOrders"] as const) {
    accountSlots.requireSlot(getAccountSlotKey(request, apiCacheKey, owner), slot);
  }
  // SWR drops a poll that started before the refresh mutation ended, even when the tracker accepted its newer slot.
  const revalidateAfterOverlappingReads = (request: GmsolAccountRequest) => {
    void accountSlots
      .acceptsNewerSlotInFlight(getAccountSlotKey(request, apiCacheKey, owner))
      .then((accepted) => accepted && mutate(getGmsolAccountDataKey(request, apiCacheKey, owner)));
  };
  await Promise.all([
    mutateSWRWithFreshness(
      getGmsolAccountDataKey("gmsolPositions", apiCacheKey, owner),
      fetchPositions(sdk, owner, apiCacheKey)
    ).finally(() => revalidateAfterOverlappingReads("gmsolPositions")),
    mutateSWRWithFreshness(
      getGmsolAccountDataKey("gmsolOrders", apiCacheKey, owner),
      fetchOrders(sdk, owner, apiCacheKey)
    ).finally(() => revalidateAfterOverlappingReads("gmsolOrders")),
  ]);
}

// `owner` is the Solana wallet from GMX's connect flow; without one nothing is requested.
export function useGmsolPositions(owner: string | undefined) {
  return useGmsolAccountRequest<ApiPositionInfo[]>("gmsolPositions", owner, fetchPositions, POSITIONS_REFRESH_INTERVAL);
}

export function useGmsolOrders(owner: string | undefined) {
  return useGmsolAccountRequest<ApiOrderInfo[]>("gmsolOrders", owner, fetchOrders);
}

export function useGmsolFeeDiscount(owner: string | undefined) {
  const result = useGmsolAccountRequest<FeeDiscount>(
    "gmsolFeeDiscount",
    owner,
    (sdk, address) => sdk.fetchFeeDiscount({ address }),
    FEE_DISCOUNT_REFRESH_INTERVAL
  );

  return result.error ? { ...result, data: undefined } : result;
}
