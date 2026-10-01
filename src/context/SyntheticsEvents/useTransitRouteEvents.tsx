import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { mockTransitApi } from "domain/synthetics/paxosTransit/mockTransitApi";
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitOrders";
import {
  type NewTransitRouteProgress,
  type PaxosTransitConversion,
  type TransitRouteProgress,
} from "domain/synthetics/paxosTransit/transitRouteProgress";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder } from "sdk/utils/paxos/types";

const ORDER_REFRESH_INTERVAL = 5_000;

export type TransitRouteEventsState = {
  transitRouteProgress: TransitRouteProgress | undefined;
  paxosTransitOrder: TransitOrder | undefined;
  isPaxosTransitOrderStatusUnknown: boolean;
  startTransitRouteProgress: (params: NewTransitRouteProgress) => void;
  attachTransitRouteConversion: (progressId: number, conversion: PaxosTransitConversion) => void;
};

export function useTransitRouteEvents(chainId: ContractsChainId): TransitRouteEventsState {
  const [transitRouteProgress, setTransitRouteProgress] = useState<TransitRouteProgress | undefined>(undefined);

  const progressChainId = transitRouteProgress?.chainId ?? chainId;
  const conversion = transitRouteProgress?.conversion;
  const sdk = useGmxSdk(progressChainId);
  const api = conversion?.isMocked ? mockTransitApi : sdk;

  const { data: paxosTransitOrder, error: paxosTransitOrderError } = useSWR(
    conversion && api ? ["transitRouteProgressOrder", progressChainId, conversion.orderId] : null,
    () => api!.fetchTransitOrder({ orderId: conversion!.orderId }),
    { refreshInterval: (order) => (getIsTransitOrderFinal(order) ? 0 : ORDER_REFRESH_INTERVAL) }
  );

  const updateTransitRouteProgress = useCallback((progressId: number, patch: Partial<TransitRouteProgress>) => {
    setTransitRouteProgress((current) => (current?.id === progressId ? { ...current, ...patch } : current));
  }, []);

  const startTransitRouteProgress = useCallback((params: NewTransitRouteProgress) => {
    setTransitRouteProgress({ ...params, id: Date.now() });
  }, []);

  const attachTransitRouteConversion = useCallback(
    (progressId: number, paxosTransitConversion: PaxosTransitConversion) =>
      updateTransitRouteProgress(progressId, { conversion: paxosTransitConversion }),
    [updateTransitRouteProgress]
  );

  return useMemo(
    () => ({
      transitRouteProgress,
      paxosTransitOrder,
      isPaxosTransitOrderStatusUnknown: paxosTransitOrderError !== undefined,
      startTransitRouteProgress,
      attachTransitRouteConversion,
    }),
    [
      attachTransitRouteConversion,
      paxosTransitOrder,
      paxosTransitOrderError,
      transitRouteProgress,
      startTransitRouteProgress,
    ]
  );
}
