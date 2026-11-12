import { useMemo } from "react";

import { getUiApiCacheKey } from "config/api";
import { SOLANA_NETWORK_ID } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { FeeDiscount, GmxApiSdk } from "sdk/clients/v2";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import type { ApiPositionInfo } from "sdk/utils/positions/types";

import { commitGmsolSnapshot, fetchGmsolOrders, fetchGmsolPositions } from "./api/refetchAtSlot";

// Positions are read from the Solana RPC on every request; 15 s fits the host's RPC budget.
const POSITIONS_REFRESH_INTERVAL = 15_000;
// Rank and referrer discounts move slowly. At 5 s the host answers 429 around 120 wallets.
const FEE_DISCOUNT_REFRESH_INTERVAL = 60_000;

type GmsolAccountRequest = "gmsolPositions" | "gmsolOrders" | "gmsolFeeDiscount";

type GmsolAccountRead = { sdk: GmxApiSdk; owner: string; apiCacheKey: string };

// Highest X-Solana-Slot accepted for this host, wallet and request. Older responses cannot replace it.
const acceptedGmsolSlots = new Map<string, number>();

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
  fetcher: (read: GmsolAccountRead) => Promise<T>,
  refreshInterval = FREQUENT_UPDATE_INTERVAL
): GmsolAccountDataResult<T> {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const key = owner && sdk ? getGmsolAccountDataKey(request, getUiApiCacheKey(SOLANA_NETWORK_ID), owner) : null;

  const { data, error, isLoading, freshness } = useSWRWithFreshness<T>(
    key,
    ([, , keyApiCacheKey, keyOwner]: NonNullable<typeof key>) =>
      fetcher({ sdk: sdk!, owner: keyOwner, apiCacheKey: keyApiCacheKey }),
    { refreshInterval }
  );
  const isOverdue = freshness.isStale && !error;
  const overdueError = useMemo(
    () => (isOverdue ? new Error(`${request} has not refreshed within its grace period`) : undefined),
    [isOverdue, request]
  );

  return {
    data: key ? data : undefined,
    isLoading: key ? isLoading : false,
    error: key ? error ?? overdueError : undefined,
  };
}

function takeGmsolSnapshot<T>(key: string, responseSlot: number | undefined, response: T): T {
  const next = commitGmsolSnapshot({
    acceptedSlot: acceptedGmsolSlots.get(key),
    responseSlot,
    response,
  });

  acceptedGmsolSlots.set(key, next.slot);

  return next.data;
}

function fetchPositions({ sdk, owner, apiCacheKey }: GmsolAccountRead) {
  return fetchGmsolPositions(sdk, owner).then((body) =>
    takeGmsolSnapshot(`${apiCacheKey}:gmsolPositions:${owner}`, body.slot, body.data)
  );
}

function fetchOrders({ sdk, owner, apiCacheKey }: GmsolAccountRead) {
  return fetchGmsolOrders(sdk, owner).then((body) =>
    takeGmsolSnapshot(`${apiCacheKey}:gmsolOrders:${owner}`, body.slot, body.data)
  );
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
    ({ sdk, owner: address }) => sdk.fetchFeeDiscount({ address }),
    FEE_DISCOUNT_REFRESH_INTERVAL
  );

  return result.error ? { ...result, data: undefined } : result;
}
