import { t } from "@lingui/macro";
import { useCallback, useMemo, useRef, type ReactNode } from "react";

import { SolanaOrderActionsContext, type SolanaOrderActions } from "domain/solana/solanaOrderActions";
import { useSolanaOrderNotifications } from "domain/solanaOrderTracking/useSolanaOrderNotifications";
import { helperToast } from "lib/helperToast";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import type { OrderInfo } from "sdk/utils/orders/types";
import { DecreasePositionSwapType } from "sdk/utils/orders/types";

import {
  buildGmsolCancelAction,
  buildGmsolCloseAction,
  buildGmsolTriggerAction,
  buildGmsolUpdateAction,
} from "./buildOrderActions";
import { GmsolTradeboxError } from "../tradebox/buildTradeboxOrderAction";
import { getGmsolTradeboxErrorMessage } from "../tradebox/tradeboxErrorMessages";
import { getPendingGmsolSubmission } from "../transactions/pendingSubmission";
import type { GmsolOrderAction } from "../transactions/types";
import { useGmsolOrderTransactions } from "../transactions/useGmsolOrderTransactions";
import { useSolanaTradingEnabled } from "../useSolanaTradingEnabled";

function getOrderError(order: OrderInfo) {
  const metadata = order.solana;
  if (order.isTwap || !metadata) return t`This order cannot be changed on Solana`;
  if (metadata.actionState !== "pending") return t`This order is no longer open`;
  // TODO(FESOL-56): the pinned validator has no callback account rules yet, so these orders cannot be updated or closed.
  if (metadata.callback) return t`Orders with a callback cannot be changed on Solana yet`;
  return undefined;
}

/** Sends the shared position and order list actions on Solana. Mounted only inside the Solana trade state. */
export function GmsolOrderActionsProvider({ children }: { children: ReactNode }) {
  const wallet = useSolanaWalletSession();
  const { submit, isSubmitting, hasPendingSubmission } = useGmsolOrderTransactions();
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
  const checkPendingSubmission = useCallback(async (): Promise<boolean> => {
    const sendError = getSendError();
    if (sendError) {
      helperToast.error(sendError);
      return false;
    }

    const pending = getPendingGmsolSubmission(current.current.owner!);
    if (!pending) return false;

    const notification = begin({
      title: t`Previous order request`,
      trackExecution: pending.trackExecution ?? false,
    });
    try {
      notification.submitted(await submit(undefined, { onSubmitted: notification.submitted }));
    } catch (error) {
      notification.failed(error);
    }
    return false;
  }, [begin, getSendError, submit]);

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
    async (steps: { title: string; trackExecution: boolean; action: GmsolOrderAction }[]): Promise<boolean> => {
      for (const { title, trackExecution, action } of steps) {
        const sendError = getSendError();
        if (sendError) {
          helperToast.error(sendError);
          return false;
        }
        if (getPendingGmsolSubmission(current.current.owner!)) return checkPendingSubmission();

        const notification = begin({ title, trackExecution });
        try {
          notification.submitted(await submit(action, { onSubmitted: notification.submitted }));
        } catch (error) {
          notification.failed(error);
          return false;
        }
      }
      return true;
    },
    [begin, checkPendingSubmission, getSendError, submit]
  );

  // Each call is one transaction flow. An unresolved earlier submission is checked first and nothing new is sent.
  const runFlow = useCallback(
    async (
      steps: { title: string; trackExecution: boolean; build: () => GmsolOrderAction; order?: OrderInfo }[]
    ): Promise<boolean> => {
      const sendError = getSendError();
      if (sendError) {
        helperToast.error(sendError);
        return false;
      }
      if (getPendingGmsolSubmission(current.current.owner!)) return checkPendingSubmission();
      if (steps.length === 0) return false;

      for (const { order } of steps) {
        const orderError = order && getOrderError(order);
        if (orderError) {
          helperToast.error(orderError);
          return false;
        }
      }

      const actions = prepare(steps.map((step) => step.build));
      if (!actions) return false;

      return sendSequentially(
        steps.map(({ title, trackExecution }, index) => ({ title, trackExecution, action: actions[index] }))
      );
    },
    [checkPendingSubmission, getSendError, prepare, sendSequentially]
  );

  const value = useMemo(
    (): SolanaOrderActions => ({
      isSubmitting,
      error,
      hasPendingSubmission,
      getOrderError,
      checkPendingSubmission,
      closePosition: ({ position, decreaseAmounts, receiveToken, allowedSlippage }) =>
        runFlow([
          {
            title: t`Close position`,
            trackExecution: true,
            build: () => buildGmsolCloseAction({ position, decreaseAmounts, receiveToken, allowedSlippage }),
          },
        ]),
      setTriggerOrders: ({ position, entries }) => {
        const steps: { title: string; trackExecution: boolean; build: () => GmsolOrderAction; order?: OrderInfo }[] =
          [];
        for (const { amounts, existingFullCloseOrder } of entries) {
          if (!amounts) continue;
          const replaces = amounts.isFullClose && existingFullCloseOrder;
          const sameSwapType =
            existingFullCloseOrder &&
            (amounts.decreaseSwapType ?? DecreasePositionSwapType.NoSwap) ===
              existingFullCloseOrder.decreasePositionSwapType;
          if (replaces && sameSwapType) {
            steps.push({
              title: t`Update order`,
              trackExecution: false,
              order: existingFullCloseOrder,
              build: () =>
                buildGmsolUpdateAction({
                  order: existingFullCloseOrder,
                  changes: {
                    sizeDeltaUsd: undefined,
                    triggerPrice: amounts.triggerPrice,
                    acceptablePrice: amounts.acceptablePrice,
                  },
                }),
            });
            continue;
          }
          // The new order is created before the replaced one is cancelled: a failure in between leaves an extra
          // order instead of a position without its TP/SL. EVM batches both atomically in buildTpSlBatchPayloads.
          steps.push({
            title: t`Create TP/SL order`,
            trackExecution: false,
            build: () => buildGmsolTriggerAction(position, amounts),
          });
          if (replaces) {
            steps.push({
              title: t`Cancel order`,
              trackExecution: false,
              order: existingFullCloseOrder,
              build: () => buildGmsolCancelAction(existingFullCloseOrder),
            });
          }
        }
        return runFlow(steps);
      },
      updateOrder: ({ order, changes }) =>
        runFlow([
          {
            title: t`Update order`,
            trackExecution: false,
            order,
            build: () => buildGmsolUpdateAction({ order, changes }),
          },
        ]),
      cancelOrders: (orders) =>
        runFlow(
          orders.map((order) => ({
            title: t`Cancel order`,
            trackExecution: false,
            order,
            build: () => buildGmsolCancelAction(order),
          }))
        ),
    }),
    [checkPendingSubmission, error, hasPendingSubmission, isSubmitting, runFlow]
  );

  return <SolanaOrderActionsContext.Provider value={value}>{children}</SolanaOrderActionsContext.Provider>;
}
