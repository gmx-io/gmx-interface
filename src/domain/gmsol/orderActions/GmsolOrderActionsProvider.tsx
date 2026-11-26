import { t } from "@lingui/macro";
import { useCallback, useMemo, useRef, type ReactNode } from "react";

import {
  SolanaOrderActionsContext,
  type SolanaOrderActions,
  type SolanaOrderChanges,
  type SolanaTriggerEntry,
} from "domain/solana/solanaOrderActions";
import { helperToast } from "lib/helperToast";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import { isSwapOrderType } from "sdk/utils/orders";
import type { OrderInfo, PositionOrderInfo } from "sdk/utils/orders/types";
import { DecreasePositionSwapType } from "sdk/utils/orders/types";

import { getOrderStatusTitle, type OrderStatusTitleData } from "components/StatusNotification/getOrderStatusTitle";

import {
  buildGmsolCancelAction,
  buildGmsolCloseAction,
  buildGmsolTriggerAction,
  buildGmsolUpdateAction,
} from "./buildOrderActions";
import { getGmsolCreateOrderTitles, getGmsolOrderTitle } from "../orderTracking/orderStatusTitles";
import { useSolanaOrderNotifications } from "../orderTracking/useSolanaOrderNotifications";
import { GmsolTradeboxError } from "../tradebox/buildTradeboxOrderAction";
import { getGmsolTradeboxErrorMessage } from "../tradebox/tradeboxErrorMessages";
import { getPendingGmsolSubmission, type PendingGmsolSubmission } from "../transactions/pendingSubmission";
import type { GmsolOrderAction } from "../transactions/types";
import {
  getIsGmsolOrderSubmitting,
  useGmsolOrderTransactions,
  type GmsolOrderSubmission,
} from "../transactions/useGmsolOrderTransactions";
import { useSolanaTradingEnabled } from "../useSolanaTradingEnabled";

// A cancel closes the order account, so it needs no order kind, unlike an edit.
function getCancelError(order: OrderInfo) {
  const metadata = order.solana;
  if (order.isTwap || !metadata) return t`This order cannot be changed on Solana`;
  if (metadata.actionState !== "pending") return t`This order is no longer open`;
  // TODO(FESOL-56): the pinned validator has no callback account rules yet, so these orders cannot be updated or closed.
  if (metadata.callback) return t`Orders with a callback cannot be changed on Solana yet`;
  return undefined;
}

function getOrderError(order: OrderInfo) {
  // getGmsolOrderContext maps position order kinds only
  if (isSwapOrderType(order.orderType)) return t`This order cannot be changed on Solana`;
  return getCancelError(order);
}

type SkippedOrder = { order: OrderInfo; reason: string };

function getSkippedOrdersMessage(skipped: SkippedOrder[]) {
  return (
    <>
      {skipped.map(({ order, reason }) => {
        const title = getOrderStatusTitle(getGmsolOrderTitle(order, "cancel"));
        return <div key={order.key}>{t`Not sent: ${title}. ${reason}`}</div>;
      })}
    </>
  );
}

function getUpdateError({ order, changes }: { order: PositionOrderInfo; changes: SolanaOrderChanges }) {
  try {
    buildGmsolUpdateAction({ order, changes });
    return undefined;
  } catch (error) {
    // "amounts" is an edit without changes, which the shared order validation already reports
    if (error instanceof GmsolTradeboxError && error.code !== "amounts")
      return getGmsolTradeboxErrorMessage(error.code);
    return undefined;
  }
}

type FlowStep = {
  trackExecution: boolean;
  build: () => GmsolOrderAction;
  titles: (action: GmsolOrderAction) => OrderStatusTitleData[];
  // Why the existing order this step changes cannot be changed on Solana
  orderError?: string;
};

/** Sends the shared position and order list actions on Solana. Mounted only inside the Solana trade state. */
export function GmsolOrderActionsProvider({ children }: { children: ReactNode }) {
  const wallet = useSolanaWalletSession();
  const { acquire, isSubmitting, hasPendingSubmission } = useGmsolOrderTransactions();
  const { begin } = useSolanaOrderNotifications();
  const trading = useSolanaTradingEnabled({ enabled: Boolean(wallet.address) });
  const hasOutdatedUi = useHasOutdatedUi();

  let error: string | undefined;
  if (hasOutdatedUi) error = t`Page outdated. Refresh`;
  else if (wallet.isRestoring) error = t`Connecting wallet...`;
  else if (!wallet.address) error = t`Connect wallet`;
  else if (trading.isLoading) error = t`Loading...`;
  else if (!trading.isSolanaTradingEnabled) error = t`Solana trading is unavailable`;

  const current = useRef({ error, owner: wallet.address });
  current.current = { error, owner: wallet.address };

  const getSendError = useCallback(() => {
    const { error, owner } = current.current;
    return error || !owner ? error ?? t`Connect wallet` : undefined;
  }, []);

  // Resolves an unresolved earlier submission without sending anything new; always resolves to false.
  const check = useCallback(
    async (submission: GmsolOrderSubmission, pending: PendingGmsolSubmission): Promise<boolean> => {
      const notification = begin({
        owner: submission.owner,
        operation: pending.operation,
        orders: [],
        trackExecution: pending.trackExecution ?? false,
      });
      try {
        notification.submitted(await submission.submit(undefined, { onSubmitted: notification.submitted }));
      } catch (error) {
        notification.failed(error);
      }
      return false;
    },
    [begin]
  );

  // A call made while another flow holds the wallet returns before any toast, so that flow's toast stays open.
  const checkPendingSubmission = useCallback(async (): Promise<boolean> => {
    if (getIsGmsolOrderSubmitting()) return false;
    const sendError = getSendError();
    if (sendError) {
      helperToast.error(sendError);
      return false;
    }

    const pending = getPendingGmsolSubmission(current.current.owner!);
    if (!pending) return false;
    const submission = acquire(current.current.owner);
    if (!submission) return false;
    try {
      return await check(submission, pending);
    } finally {
      submission.release();
    }
  }, [acquire, check, getSendError]);

  // Every action is built before the first transaction is sent, so a build error never leaves a flow half-sent.
  const prepare = useCallback((builds: (() => GmsolOrderAction)[]): GmsolOrderAction[] | undefined => {
    try {
      return builds.map((build) => build());
    } catch (error) {
      helperToast.error(
        error instanceof GmsolTradeboxError ? getGmsolTradeboxErrorMessage(error.code) : t`Unable to prepare order`
      );
      return undefined;
    }
  }, []);

  // One order account per transaction: the sender allows a single unresolved submission at a time.
  const sendSequentially = useCallback(
    async (
      submission: GmsolOrderSubmission,
      steps: { trackExecution: boolean; action: GmsolOrderAction; orders: OrderStatusTitleData[] }[]
    ): Promise<number> => {
      for (const [index, { trackExecution, action, orders }] of steps.entries()) {
        const sendError = getSendError();
        if (sendError) {
          helperToast.error(sendError);
          return index;
        }
        if (!submission.isActive()) return index;
        const pending = getPendingGmsolSubmission(submission.owner);
        if (pending) {
          await check(submission, pending);
          return index;
        }

        const notification = begin({ owner: submission.owner, operation: action.type, orders, trackExecution });
        try {
          notification.submitted(await submission.submit(action, { onSubmitted: notification.submitted }));
        } catch (error) {
          notification.failed(error);
          return index;
        }
      }
      return steps.length;
    },
    [begin, check, getSendError]
  );

  // Each call is one transaction flow. An unresolved earlier submission is checked first and nothing new is sent.
  // Resolves to how many steps confirmed, counted from the first.
  const runFlow = useCallback(
    async (steps: FlowStep[], skipped: SkippedOrder[] = []): Promise<number> => {
      if (getIsGmsolOrderSubmitting()) return 0;
      const sendError = getSendError();
      if (sendError) {
        helperToast.error(sendError);
        return 0;
      }
      if (getPendingGmsolSubmission(current.current.owner!)) {
        await checkPendingSubmission();
        return 0;
      }
      if (steps.length === 0 && skipped.length === 0) return 0;

      const orderError = steps.find((step) => step.orderError)?.orderError;
      if (orderError) {
        helperToast.error(orderError);
        return 0;
      }

      const actions = prepare(steps.map((step) => step.build));
      if (!actions) return 0;

      let confirmed = 0;
      if (steps.length > 0) {
        const submission = acquire(current.current.owner);
        if (!submission) return 0;
        try {
          confirmed = await sendSequentially(
            submission,
            steps.map(({ trackExecution, titles }, index) => ({
              trackExecution,
              action: actions[index],
              orders: titles(actions[index]),
            }))
          );
        } finally {
          submission.release();
        }
      }
      // Every toast replaces the previous one, so the skipped orders are named after the last order toast.
      if (skipped.length > 0 && confirmed === steps.length) helperToast.error(getSkippedOrdersMessage(skipped));
      return confirmed;
    },
    [acquire, checkPendingSubmission, getSendError, prepare, sendSequentially]
  );

  const value = useMemo(
    (): SolanaOrderActions => ({
      isSubmitting,
      error,
      hasPendingSubmission,
      getOrderError,
      getUpdateError,
      checkPendingSubmission,
      closePosition: async ({ position, decreaseAmounts, receiveToken, allowedSlippage }) =>
        (await runFlow([
          {
            trackExecution: true,
            build: () => buildGmsolCloseAction({ position, decreaseAmounts, receiveToken, allowedSlippage }),
            titles: (action) => getGmsolCreateOrderTitles(action, position),
          },
        ])) === 1,
      setTriggerOrders: async ({ position, entries }) => {
        const steps: (FlowStep & { entry?: SolanaTriggerEntry })[] = [];
        for (const entry of entries) {
          const { amounts, existingFullCloseOrder } = entry;
          if (!amounts) continue;
          const replaces = amounts.isFullClose && existingFullCloseOrder;
          const sameSwapType =
            existingFullCloseOrder &&
            (amounts.decreaseSwapType ?? DecreasePositionSwapType.NoSwap) ===
              existingFullCloseOrder.decreasePositionSwapType;
          if (replaces && sameSwapType) {
            steps.push({
              entry,
              trackExecution: false,
              orderError: getOrderError(existingFullCloseOrder),
              build: () =>
                buildGmsolUpdateAction({
                  order: existingFullCloseOrder,
                  changes: {
                    sizeDeltaUsd: undefined,
                    triggerPrice: amounts.triggerPrice,
                    acceptablePrice: amounts.acceptablePrice,
                  },
                }),
              titles: () => [getGmsolOrderTitle(existingFullCloseOrder, "update")],
            });
            continue;
          }
          // The new order is created before the replaced one is cancelled: a failure in between leaves an extra
          // order instead of a position without its TP/SL. EVM batches both atomically in buildTpSlBatchPayloads.
          steps.push({
            entry,
            trackExecution: false,
            build: () => buildGmsolTriggerAction(position, amounts),
            titles: (action) => getGmsolCreateOrderTitles(action, position),
          });
          if (replaces) {
            steps.push({
              trackExecution: false,
              orderError: getCancelError(existingFullCloseOrder),
              build: () => buildGmsolCancelAction(existingFullCloseOrder),
              titles: () => [getGmsolOrderTitle(existingFullCloseOrder, "cancel")],
            });
          }
        }
        const confirmed = await runFlow(steps);
        // An entry is sent once its order is created or updated, even if cancelling the order it replaces failed.
        return steps.slice(0, confirmed).flatMap((step) => (step.entry ? [step.entry] : []));
      },
      updateOrder: async ({ order, changes }) =>
        (await runFlow([
          {
            trackExecution: false,
            orderError: getOrderError(order),
            build: () => buildGmsolUpdateAction({ order, changes }),
            titles: () => [getGmsolOrderTitle(order, "update")],
          },
        ])) === 1,
      cancelOrders: async (orders) => {
        const steps: FlowStep[] = [];
        const skipped: SkippedOrder[] = [];
        for (const order of orders) {
          const reason = getCancelError(order);
          if (reason) skipped.push({ order, reason });
          else
            steps.push({
              trackExecution: false,
              build: () => buildGmsolCancelAction(order),
              titles: () => [getGmsolOrderTitle(order, "cancel")],
            });
        }
        const confirmed = await runFlow(steps, skipped);
        return orders.length > 0 && confirmed === orders.length;
      },
    }),
    [checkPendingSubmission, error, hasPendingSubmission, isSubmitting, runFlow]
  );

  return <SolanaOrderActionsContext.Provider value={value}>{children}</SolanaOrderActionsContext.Provider>;
}
