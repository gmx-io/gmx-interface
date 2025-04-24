import { OrderTxnType, OrderType } from "domain/synthetics/orders";
import { SignedSubbacountApproval } from "domain/synthetics/subaccount";
import { OrderMetricId } from "lib/metrics/types";
import { SignedTokenPermit } from "sdk/types/tokens";
import { ExternalSwapOutput } from "sdk/types/trade";

export type MultiTransactionStatus<TEventData> = {
  key: string;
  data?: TEventData;
  createdTxnHash?: string;
  cancelledTxnHash?: string;
  gelatoTaskId?: string;
  isGelatoTaskFailed?: boolean;
  updatedTxnHash?: string;
  executedTxnHash?: string;
  createdAt: number;
  isViewed?: boolean;
};

export type PositionIncreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  borrowingFactor: bigint;
  executionPrice: bigint;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  longTokenFundingAmountPerSize: bigint;
  shortTokenFundingAmountPerSize: bigint;
  collateralDeltaAmount: bigint;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  increasedAtTime: bigint;
};

export type PositionDecreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralAmount: bigint;
  collateralDeltaAmount: bigint;
  borrowingFactor: bigint;
  longTokenFundingAmountPerSize: bigint;
  shortTokenFundingAmountPerSize: bigint;
  pnlUsd: bigint;
  isLong: boolean;
  orderType: OrderType;
  orderKey: string;
  decreasedAtTime: bigint;
};

export type PendingPositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaAmount: bigint;
  updatedAt: number;
  updatedAtBlock: bigint;
};

export type PendingExpressTxnParams = {
  taskId: string;
  isSponsoredCall: boolean;
  subaccountApproval?: SignedSubbacountApproval;
  tokenPermits?: SignedTokenPermit[];
  pendingOrdersKeys?: string[];
  pendingPositionsKeys?: string[];
  metricId?: OrderMetricId;
};

export type PendingPositionsUpdates = {
  [key: string]: PendingPositionUpdate | undefined;
};

export type PendingOrdersUpdates = {
  [key: string]: OrderTxnType;
};

export type EventLogItems<T> = {
  [key: string]: T;
};

export type EventLogArrayItems<T> = {
  [key: string]: T[];
};

export type PendingExpressTxns = {
  [taskId: string]: PendingExpressTxnParams;
};

export type EventLogSection<T> = {
  items: EventLogItems<T>;
  arrayItems: EventLogArrayItems<T>;
};

export type EventLogData = {
  addressItems: EventLogSection<string>;
  uintItems: EventLogSection<bigint>;
  intItems: EventLogSection<bigint>;
  boolItems: EventLogSection<boolean>;
  bytes32Items: EventLogSection<string>;
  bytesItems: EventLogSection<string>;
  stringItems: EventLogSection<string>;
};

export type EventTxnParams = {
  transactionHash: string;
  blockNumber: number;
};

export type SyntheticsEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  shiftStatuses: ShiftStatuses;
  approvalStatuses: ApprovalStatuses;
  pendingOrdersUpdates: PendingOrdersUpdates;
  pendingPositionsUpdates: PendingPositionsUpdates;
  positionIncreaseEvents: PositionIncreaseEvent[] | undefined;
  positionDecreaseEvents: PositionDecreaseEvent[] | undefined;
  pendingExpressTxns: PendingExpressTxns;
  setPendingExpressTxn: (params: PendingExpressTxnParams) => void;
  setPendingOrder: SetPendingOrder;
  setPendingOrderUpdate: SetPendingOrderUpdate;
  setPendingFundingFeeSettlement: SetPendingFundingFeeSettlement;
  setPendingPosition: SetPendingPosition;
  setPendingDeposit: SetPendingDeposit;
  setPendingWithdrawal: SetPendingWithdrawal;
  setPendingShift: SetPendingShift;
  setOrderStatusViewed: (key: string) => void;
  setDepositStatusViewed: (key: string) => void;
  setWithdrawalStatusViewed: (key: string) => void;
  setShiftStatusViewed: (key: string) => void;
};

export type SetPendingOrder = (data: PendingOrderData | PendingOrderData[]) => void;
export type SetPendingOrderUpdate = (data: PendingOrderData, remove?: "remove") => void;
export type SetPendingPosition = (update: PendingPositionUpdate) => void;
export type SetPendingDeposit = (data: PendingDepositData) => void;
export type SetPendingWithdrawal = (data: PendingWithdrawalData) => void;
export type SetPendingShift = (data: PendingShiftData) => void;
export type SetPendingFundingFeeSettlement = (data: PendingFundingFeeSettlementData) => void;

export type PendingFundingFeeSettlementData = {
  orders: PendingOrderData[];
  positions: PendingPositionUpdate[];
};

export type OrderCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  contractTriggerPrice: bigint;
  contractAcceptablePrice: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  minOutputAmount: bigint;
  updatedAtBlock: bigint;
  orderType: OrderType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  externalSwapQuote: undefined;
  isFrozen: boolean;
};

export type PendingOrderData = {
  orderKey?: string;
  account: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  externalSwapQuote: ExternalSwapOutput | undefined;
  initialCollateralDeltaAmount: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  autoCancel: boolean;
  minOutputAmount: bigint;
  sizeDeltaUsd: bigint;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  orderType: OrderType;
  referralCode?: string;
  txnType: OrderTxnType;
};

export type DepositCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: bigint;
  initialShortTokenAmount: bigint;
  minMarketTokens: bigint;
  updatedAtBlock: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
  isGlvDeposit: boolean;
  marketTokenAmount?: bigint;
  isMarketDeposit?: boolean;
  initialMarketTokenAmount?: bigint;
};

export type GLVDepositCreatedEventData = DepositCreatedEventData & {
  glvAddress: string;
  isGlvDeposit: true;
};

export type PendingDepositData = {
  account: string;
  marketAddress: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: bigint;
  initialShortTokenAmount: bigint;
  minMarketTokens: bigint;
  shouldUnwrapNativeToken: boolean;

  /** For GLV deposits */
  isGlvDeposit: boolean;
  glvAddress?: string;
  isMarketDeposit?: boolean;
  marketTokenAmount?: bigint;
  initialMarketTokenAmount?: bigint;
};

export type WithdrawalCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  marketTokenAmount: bigint;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  updatedAtBlock: bigint;
  executionFee: bigint;
  callbackGasLimit: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type PendingWithdrawalData = {
  account: string;
  marketAddress: string;
  marketTokenAmount: bigint;
  minLongTokenAmount: bigint;
  minShortTokenAmount: bigint;
  shouldUnwrapNativeToken: boolean;
};

export type ShiftCreatedEventData = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  fromMarket: string;
  toMarket: string;
  marketTokenAmount: bigint;
  minMarketTokens: bigint;
  updatedAtTime: bigint;
  executionFee: bigint;
};

export type PendingShiftData = {
  account: string;
  fromMarket: string;
  marketTokenAmount: bigint;
  toMarket: string;
  minMarketTokens: bigint;
};

export type OrderStatus = MultiTransactionStatus<OrderCreatedEventData>;
export type DepositStatus = MultiTransactionStatus<DepositCreatedEventData | GLVDepositCreatedEventData>;
export type WithdrawalStatus = MultiTransactionStatus<WithdrawalCreatedEventData>;
export type ShiftStatus = MultiTransactionStatus<ShiftCreatedEventData>;

export type OrderStatuses = {
  [key: string]: OrderStatus;
};

export type DepositStatuses = {
  [key: string]: DepositStatus;
};

export type WithdrawalStatuses = {
  [key: string]: WithdrawalStatus;
};

export type ShiftStatuses = {
  [key: string]: ShiftStatus;
};

export type ApprovalStatuses = {
  [tokenAddress: string]: {
    [spender: string]: { value: bigint; createdAt: number };
  };
};
