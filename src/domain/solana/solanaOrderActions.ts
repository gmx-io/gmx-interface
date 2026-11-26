import { createContext, useContext } from "react";

import { isSolanaNetwork } from "config/chains";
import type { GmsolSubmissionOrigin } from "domain/gmsol/transactions/pendingSubmission";
import { useChainId } from "lib/chains";
import type { OrderInfo, PositionOrderInfo } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import type { TokenData } from "sdk/utils/tokens/types";
import type { DecreasePositionAmounts } from "sdk/utils/trade/types";

export type SolanaTriggerEntry = {
  amounts: DecreasePositionAmounts | undefined;
  // A full-close TP/SL the new one replaces, as in buildTpSlBatchPayloads.
  existingFullCloseOrder: PositionOrderInfo | undefined;
};

export type SolanaOrderChanges = {
  sizeDeltaUsd: bigint | undefined;
  triggerPrice: bigint | undefined;
  acceptablePrice: bigint | undefined;
};

/**
 * Close, TP/SL, edit and cancel on Solana for the shared position and order UI.
 * The Solana state provider supplies it, so it is undefined on EVM networks.
 * Actions resolve to true once confirmed, setTriggerOrders to the confirmed entries; failures show in a notification.
 */
export type SolanaOrderActions = {
  isSubmitting: boolean;
  // Why nothing can be sent right now (loading, trading off, outdated page), or undefined
  error: string | undefined;
  busyReason: string | undefined;
  // An earlier submission from any origin is unresolved: the next action only checks it and reports nothing sent
  hasPendingSubmission: boolean;
  // Sends nothing new; true only if its order transaction confirmed and its record has the caller's origin or none
  checkPendingSubmission: (p: { origin: GmsolSubmissionOrigin }) => Promise<boolean>;
  closePosition: (p: {
    position: PositionInfo;
    decreaseAmounts: DecreasePositionAmounts;
    receiveToken: TokenData;
    allowedSlippage: number;
  }) => Promise<boolean>;
  setTriggerOrders: (p: { position: PositionInfo; entries: SolanaTriggerEntry[] }) => Promise<SolanaTriggerEntry[]>;
  updateOrder: (p: { order: PositionOrderInfo; changes: SolanaOrderChanges }) => Promise<boolean>;
  cancelOrders: (orders: OrderInfo[]) => Promise<boolean>;
  // Why this order cannot be edited on Solana, or undefined
  getOrderError: (order: OrderInfo) => string | undefined;
  // Why these edits cannot be sent on Solana, or undefined; an edit without changes is left to the shared validation
  getUpdateError: (p: { order: PositionOrderInfo; changes: SolanaOrderChanges }) => string | undefined;
};

export const SolanaOrderActionsContext = createContext<SolanaOrderActions | undefined>(undefined);

export function useSolanaOrderActions(): SolanaOrderActions | undefined {
  const { networkId } = useChainId();
  const actions = useContext(SolanaOrderActionsContext);

  return isSolanaNetwork(networkId) ? actions : undefined;
}
