import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";

import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { GlvAndGmMarketsInfoData } from "domain/synthetics/markets/types";
import { mockTransitApi } from "domain/synthetics/paxosTransit/mockTransitApi";
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitOrders";
import {
  type NewTransitRouteProgress,
  type PaxosTransitConversion,
  type TransitRouteProgress,
} from "domain/synthetics/paxosTransit/transitRouteProgress";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder } from "sdk/utils/paxos/types";

import { PaxosTransitStatusNotification } from "components/StatusNotification/PaxosTransitStatusNotification";

const ORDER_REFRESH_INTERVAL = 5_000;

export type TransitRouteEventsState = {
  transitRouteProgress: TransitRouteProgress | undefined;
  paxosTransitOrder: TransitOrder | undefined;
  isPaxosTransitOrderStatusUnknown: boolean;
  startTransitRouteProgress: (params: NewTransitRouteProgress) => void;
  attachTransitRouteConversion: (progressId: number, conversion: PaxosTransitConversion) => void;
  attachTransitRouteDeposit: (progressId: number, depositTxnHash: string) => void;
  setTransitRouteContinueRequested: (progressId: number, isContinueRequested: boolean) => void;
};

export function useTransitRouteEvents(
  chainId: ContractsChainId,
  { glvAndGmMarketsData }: { glvAndGmMarketsData: GlvAndGmMarketsInfoData }
): TransitRouteEventsState {
  const [transitRouteProgress, setTransitRouteProgress] = useState<TransitRouteProgress | undefined>(undefined);
  const progressIdRef = useRef<number | undefined>(undefined);

  const progressChainId = transitRouteProgress?.chainId ?? chainId;
  const conversion = transitRouteProgress?.conversion;
  const sdk = useGmxSdk(progressChainId);
  const api = conversion?.isMocked ? mockTransitApi : sdk;

  const { data: paxosTransitOrder, error: paxosTransitOrderError } = useSWR(
    conversion && api ? ["transitRouteProgressOrder", progressChainId, conversion.orderId] : null,
    () => api!.fetchTransitOrder({ orderId: conversion!.orderId }),
    { refreshInterval: (order) => (getIsTransitOrderFinal(order) ? 0 : ORDER_REFRESH_INTERVAL) }
  );

  const glvOrMarketInfo = getByKey(glvAndGmMarketsData, transitRouteProgress?.glvOrMarketAddress);

  const updateTransitRouteProgress = useCallback((progressId: number, patch: Partial<TransitRouteProgress>) => {
    setTransitRouteProgress((current) => (current?.id === progressId ? { ...current, ...patch } : current));
  }, []);

  const startTransitRouteProgress = useCallback((params: NewTransitRouteProgress) => {
    if (progressIdRef.current !== undefined) {
      toast.dismiss(progressIdRef.current);
    }

    setTransitRouteProgress({ ...params, id: Date.now(), depositTxnHash: undefined, isContinueRequested: false });
  }, []);

  useEffect(
    function showTransitRouteToast() {
      if (!transitRouteProgress || !glvOrMarketInfo || progressIdRef.current === transitRouteProgress.id) {
        return;
      }

      const progressId = transitRouteProgress.id;
      progressIdRef.current = progressId;

      helperToast.success(
        <PaxosTransitStatusNotification toastTimestamp={progressId} glvOrMarketInfo={glvOrMarketInfo} />,
        { autoClose: false, toastId: progressId }
      );
    },
    [glvOrMarketInfo, transitRouteProgress]
  );

  const attachTransitRouteConversion = useCallback(
    (progressId: number, paxosTransitConversion: PaxosTransitConversion) =>
      updateTransitRouteProgress(progressId, { conversion: paxosTransitConversion }),
    [updateTransitRouteProgress]
  );

  const attachTransitRouteDeposit = useCallback(
    (progressId: number, depositTxnHash: string) => updateTransitRouteProgress(progressId, { depositTxnHash }),
    [updateTransitRouteProgress]
  );

  const setTransitRouteContinueRequested = useCallback(
    (progressId: number, isContinueRequested: boolean) =>
      updateTransitRouteProgress(progressId, { isContinueRequested }),
    [updateTransitRouteProgress]
  );

  return useMemo(
    () => ({
      transitRouteProgress,
      paxosTransitOrder,
      isPaxosTransitOrderStatusUnknown: paxosTransitOrderError !== undefined,
      startTransitRouteProgress,
      attachTransitRouteConversion,
      attachTransitRouteDeposit,
      setTransitRouteContinueRequested,
    }),
    [
      attachTransitRouteDeposit,
      attachTransitRouteConversion,
      paxosTransitOrder,
      paxosTransitOrderError,
      transitRouteProgress,
      setTransitRouteContinueRequested,
      startTransitRouteProgress,
    ]
  );
}
