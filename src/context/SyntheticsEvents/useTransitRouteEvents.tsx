import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { GlvAndGmMarketsInfoData } from "domain/synthetics/markets/types";
import { mockTransitApi } from "domain/synthetics/paxosTransit/mockTransitApi";
import {
  findSubmittedTransitOrder,
  getIsTransitOrderFinal,
  TRANSIT_RECENT_ORDERS_PAGE_SIZE,
} from "domain/synthetics/paxosTransit/transitOrders";
import {
  getIsTransitOrderLookupExpired,
  getShouldStoreTransitRouteProgress,
  readStoredTransitRouteProgress,
  removeStoredTransitRouteProgress,
  writeStoredTransitRouteProgress,
  type NewTransitRouteProgress,
  type PaxosTransitConversion,
  type TransitRouteProgress,
} from "domain/synthetics/paxosTransit/transitRouteProgress";
import { removeTransitConversionProposal } from "domain/synthetics/paxosTransit/transitWalletProposals";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitOrder, TransitOrderStatus } from "sdk/utils/paxos/types";

import { CloseToastButton } from "components/CloseToastButton/CloseToastButton";
import { PaxosTransitStatusNotification } from "components/StatusNotification/PaxosTransitStatusNotification";

import type { WithdrawalStatuses } from "./types";

const ORDER_REFRESH_INTERVAL = 5_000;

export type TransitRouteEventsState = {
  transitRouteProgress: TransitRouteProgress | undefined;
  paxosTransitOrder: TransitOrder | undefined;
  isPaxosTransitOrderStatusUnknown: boolean;
  isPaxosTransitOrderLookupExpired: boolean;
  startTransitRouteProgress: (params: NewTransitRouteProgress) => void;
  attachTransitRouteConversion: (progressId: number, conversion: PaxosTransitConversion) => void;
  attachTransitRouteDeposit: (progressId: number, depositTxnHash: string) => void;
  setTransitRouteContinueRequested: (progressId: number, isContinueRequested: boolean) => void;
  dismissTransitRouteProgress: (progressId: number) => void;
};

export function useTransitRouteEvents(
  chainId: ContractsChainId,
  {
    glvAndGmMarketsData,
    withdrawalStatuses,
  }: { glvAndGmMarketsData: GlvAndGmMarketsInfoData; withdrawalStatuses: WithdrawalStatuses }
): TransitRouteEventsState {
  const [transitRouteProgress, setTransitRouteProgress] = useState<TransitRouteProgress | undefined>(
    readStoredTransitRouteProgress
  );
  const toastShownForRef = useRef<{ progress: TransitRouteProgress; orderStatus: TransitOrderStatus | undefined }>();

  const progressChainId = transitRouteProgress?.chainId ?? chainId;
  const conversion = transitRouteProgress?.conversion;
  const sdk = useGmxSdk(progressChainId);
  const api = conversion?.isMocked ? mockTransitApi : sdk;

  const orderId = conversion?.orderId;

  const { data: paxosTransitOrder, error: paxosTransitOrderError } = useSWR(
    orderId && api ? ["transitRouteProgressOrder", progressChainId, orderId] : null,
    () => api!.fetchTransitOrder({ orderId: orderId! }),
    { refreshInterval: getOrderRefreshInterval }
  );

  const paxosTransitConfig = getPaxosTransitConfig(progressChainId);
  const knownOrderIds = conversion?.knownOrderIds;
  const isOrderLookupExpired = getIsTransitOrderLookupExpired(conversion, Date.now());
  const isOrderLookupNeeded =
    orderId === undefined && knownOrderIds !== undefined && !isOrderLookupExpired && paxosTransitConfig !== undefined;

  const { data: orderLookup } = useSWR(
    isOrderLookupNeeded && api && transitRouteProgress
      ? ["transitRouteProgressOrderLookup", progressChainId, transitRouteProgress.account, transitRouteProgress.id]
      : null,
    async () => {
      const [offerAsset, wantAsset] =
        transitRouteProgress!.direction === "usdcToUsdg"
          ? [paxosTransitConfig!.usdcAddress, paxosTransitConfig!.usdgAddress]
          : [paxosTransitConfig!.usdgAddress, paxosTransitConfig!.usdcAddress];
      const { orders } = await api!.fetchTransitOrders({
        userAddress: transitRouteProgress!.account,
        pageSize: TRANSIT_RECENT_ORDERS_PAGE_SIZE,
      });
      const order = findSubmittedTransitOrder(orders, {
        offerAsset,
        wantAsset,
        offerAmount: conversion!.offerAmount,
        knownOrderIds: knownOrderIds!,
      });

      return { order, checkedAt: Date.now() };
    },
    { refreshInterval: ORDER_REFRESH_INTERVAL }
  );
  const lookedUpOrderId = orderLookup?.order?.id;

  const orderStatus = paxosTransitOrder?.status;
  const glvOrMarketInfo = getByKey(glvAndGmMarketsData, transitRouteProgress?.glvOrMarketAddress);
  const withdrawalTxnHash = transitRouteProgress?.withdrawalTxnHash;
  const withdrawalStatus =
    withdrawalTxnHash === undefined
      ? undefined
      : Object.values(withdrawalStatuses).find((status) => status.createdTxnHash === withdrawalTxnHash);
  const withdrawalStatusExecutedTxnHash = withdrawalStatus?.executedTxnHash;
  const isWithdrawalCancelled = withdrawalStatus?.cancelledTxnHash !== undefined;

  const shouldStoreProgress =
    transitRouteProgress !== undefined &&
    getShouldStoreTransitRouteProgress({
      progress: transitRouteProgress,
      order: paxosTransitOrder,
      isWithdrawalCancelled,
      isOrderLookupExpired,
    });

  const updateTransitRouteProgress = useCallback((progressId: number, patch: Partial<TransitRouteProgress>) => {
    setTransitRouteProgress((current) => (current?.id === progressId ? { ...current, ...patch } : current));
  }, []);

  const startTransitRouteProgress = useCallback((params: NewTransitRouteProgress) => {
    if (toastShownForRef.current) {
      toast.dismiss(toastShownForRef.current.progress.id);
    }

    setTransitRouteProgress({
      ...params,
      id: Date.now(),
      withdrawalExecutedTxnHash: undefined,
      depositTxnHash: undefined,
      isContinueRequested: false,
      isDismissed: false,
    });
  }, []);

  useEffect(
    function showTransitRouteToast() {
      if (!transitRouteProgress || transitRouteProgress.isDismissed) {
        return;
      }

      if (transitRouteProgress.glvOrMarketAddress !== undefined && !glvOrMarketInfo) {
        return;
      }

      const toastShownFor = toastShownForRef.current;
      const isToastUpToDate =
        toastShownFor?.progress === transitRouteProgress && toastShownFor.orderStatus === orderStatus;

      if (isToastUpToDate) {
        return;
      }

      toastShownForRef.current = { progress: transitRouteProgress, orderStatus };
      const progressId = transitRouteProgress.id;

      if (toast.isActive(progressId)) {
        return;
      }

      helperToast.success(
        <PaxosTransitStatusNotification toastTimestamp={progressId} glvOrMarketInfo={glvOrMarketInfo} />,
        {
          autoClose: false,
          toastId: progressId,
          // only the user's close counts as dismissed: onClose also fires when another toast replaces this one
          closeButton: ({ closeToast }) => (
            <CloseToastButton
              closeToast={(event) => {
                updateTransitRouteProgress(progressId, { isDismissed: true });
                closeToast(event);
              }}
            />
          ),
        }
      );
    },
    [glvOrMarketInfo, orderStatus, transitRouteProgress, updateTransitRouteProgress]
  );

  useEffect(
    function attachLookedUpTransitOrder() {
      const currentConversion = transitRouteProgress?.conversion;

      if (!transitRouteProgress || !currentConversion || currentConversion.orderId !== undefined || !lookedUpOrderId) {
        return;
      }

      updateTransitRouteProgress(transitRouteProgress.id, {
        conversion: { ...currentConversion, orderId: lookedUpOrderId },
      });
      removeTransitConversionProposal(transitRouteProgress);
    },
    [lookedUpOrderId, transitRouteProgress, updateTransitRouteProgress]
  );

  useEffect(
    function attachTransitRouteWithdrawalExecution() {
      if (!transitRouteProgress) return;

      const isWithdrawalExecuted = withdrawalStatusExecutedTxnHash !== undefined;
      const isWithdrawalExecutionAttached = transitRouteProgress.withdrawalExecutedTxnHash !== undefined;

      if (isWithdrawalExecuted && !isWithdrawalExecutionAttached) {
        updateTransitRouteProgress(transitRouteProgress.id, {
          withdrawalExecutedTxnHash: withdrawalStatusExecutedTxnHash,
        });
      }
    },
    [transitRouteProgress, updateTransitRouteProgress, withdrawalStatusExecutedTxnHash]
  );

  useEffect(
    function storeTransitRouteProgress() {
      if (transitRouteProgress && shouldStoreProgress) {
        writeStoredTransitRouteProgress(transitRouteProgress);
        return;
      }

      removeStoredTransitRouteProgress();
    },
    [shouldStoreProgress, transitRouteProgress]
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

  const dismissTransitRouteProgress = useCallback(
    (progressId: number) => {
      updateTransitRouteProgress(progressId, { isDismissed: true });
      toast.dismiss(progressId);
    },
    [updateTransitRouteProgress]
  );

  return useMemo(
    () => ({
      transitRouteProgress,
      paxosTransitOrder,
      isPaxosTransitOrderStatusUnknown: paxosTransitOrderError !== undefined || isOrderLookupExpired,
      isPaxosTransitOrderLookupExpired: isOrderLookupExpired,
      startTransitRouteProgress,
      attachTransitRouteConversion,
      attachTransitRouteDeposit,
      setTransitRouteContinueRequested,
      dismissTransitRouteProgress,
    }),
    [
      attachTransitRouteDeposit,
      attachTransitRouteConversion,
      isOrderLookupExpired,
      paxosTransitOrder,
      paxosTransitOrderError,
      transitRouteProgress,
      setTransitRouteContinueRequested,
      startTransitRouteProgress,
      dismissTransitRouteProgress,
    ]
  );
}

function getOrderRefreshInterval(order: TransitOrder | undefined) {
  return getIsTransitOrderFinal(order) ? 0 : ORDER_REFRESH_INTERVAL;
}
