import type { ReactNode } from "react";

/**
 * Replaces context/SyntheticsEvents/SyntheticsEventsProvider in CT builds.
 * The real provider is a live websocket/event layer; component tests emulate
 * its idle state (no pending events), which matches production before any
 * transaction activity happens.
 *
 * All setters (setPendingOrder/Deposit/Withdrawal, approval statuses, multichain
 * funding) are noops: transaction/LP event flows are NOT observable in CT.
 * To test approve-button states, inject approvalStatuses here instead of noops.
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
