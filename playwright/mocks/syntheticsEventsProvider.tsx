import type { ReactNode } from "react";

/**
 * Replaces the websocket-driven SyntheticsEventsProvider in CT builds with its idle
 * state (no pending events). All setters are noops, so transaction/approval event
 * flows are not observable in CT; inject approvalStatuses here to test approve states.
 */

const noop = () => undefined;

const emptySyntheticsEvents = {
  orderStatuses: {},
  depositStatuses: {},
  withdrawalStatuses: {},
  shiftStatuses: {},
  approvalStatuses: {},
  pendingOrdersUpdates: {},
  pendingPositionsUpdates: {},
  positionIncreaseEvents: [],
  positionDecreaseEvents: [],
  pendingExpressTxns: {},
  gelatoTaskStatuses: {},
  setPendingExpressTxn: noop,
  updatePendingExpressTxn: noop,
  setPendingOrder: noop,
  setPendingOrderUpdate: noop,
  setPendingFundingFeeSettlement: noop,
  setPendingPosition: noop,
  setPendingDeposit: noop,
  setPendingWithdrawal: noop,
  setPendingShift: noop,
  setOrderStatusViewed: noop,
  setDepositStatusViewed: noop,
  setWithdrawalStatusViewed: noop,
  setShiftStatusViewed: noop,
  setMultichainTransferProgress: noop,

  multichainSourceChainApprovalStatuses: {},
  setMultichainSourceChainApprovalsActiveListener: noop,
  removeMultichainSourceChainApprovalsActiveListener: noop,
  pendingMultichainFunding: [],
  setMultichainSubmittedDeposit: noop,
  setMultichainSubmittedWithdrawal: noop,
  setMultichainWithdrawalSentTxnHash: noop,
  setMultichainWithdrawalSentError: noop,
  updatePendingMultichainFunding: noop,
  multichainFundingPendingIds: {},
  removeMultichainFundingPendingIds: noop,
  setMultichainFundingPendingId: noop,
};

export function useSyntheticsEvents() {
  return emptySyntheticsEvents;
}

export function SyntheticsEventsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
