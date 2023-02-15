import { BigNumber } from "ethers";
import { OrderType } from "../../domain/synthetics/orders";

export type ContractEventsContextType = {
  orderStatuses: OrderStatuses;
  depositStatuses: DepositStatuses;
  withdrawalStatuses: WithdrawalStatuses;
  pendingPositionsUpdates: PendingPositionsUpdates;
  positionIncreaseEvents: PositionIncreaseEvent[];
  positionDecreaseEvents: PositionDecreaseEvent[];
  touchOrderStatus: (key: string) => void;
  touchDepositStatus: (key: string) => void;
  touchWithdrawalStatus: (key: string) => void;
  setPendingPositionUpdate: (update: Omit<PendingPositionUpdate, "updatedAt" | "updatedAtBlock">) => void;
};

export type EventLogItems<T> = {
  [key: string]: T;
};

export type EventLogArrayItems<T> = {
  [key: string]: T[];
};

export type EventLogSection<T> = {
  items: EventLogItems<T>;
  arrayItems: EventLogArrayItems<T>;
};

export type EventLogData = {
  addressItems: EventLogSection<string>;
  uintItems: EventLogSection<BigNumber>;
  intItems: EventLogSection<BigNumber>;
  boolItems: EventLogSection<boolean>;
  bytes32Items: EventLogSection<string>;
  bytesItems: EventLogSection<string>;
  stringItems: EventLogSection<string>;
};

export type EventTxnParams = {
  transactionHash: string;
  blockNumber: number;
};

export type PositionIncreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  borrowingFactor: BigNumber;
  executionPrice: BigNumber;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  orderType: OrderType;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  collateralDeltaAmount: BigNumber;
  isLong: boolean;
  increasedAtBlock: BigNumber;
};

export type PositionDecreaseEvent = {
  positionKey: string;
  contractPositionKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  borrowingFactor: BigNumber;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  pnlUsd: BigNumber;
  isLong: boolean;
  decreasedAtBlock: BigNumber;
};

export type PendingPositionUpdate = {
  isIncrease: boolean;
  positionKey: string;
  sizeDeltaUsd?: BigNumber;
  sizeDeltaInTokens?: BigNumber;
  collateralDeltaAmount?: BigNumber;
  updatedAt: number;
  updatedAtBlock: BigNumber;
};

export type OrderCreatedEvent = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  marketAddress: string;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  sizeDeltaUsd: BigNumber;
  initialCollateralDeltaAmount: BigNumber;
  contractTriggerPrice: BigNumber;
  contractAcceptablePrice: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  minOutputAmount: BigNumber;
  updatedAtBlock: BigNumber;
  orderType: OrderType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  isFrozen: boolean;
};

export type DepositCreatedEvent = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  market: string;
  initialLongToken: string;
  initialShortToken: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  initialLongTokenAmount: BigNumber;
  initialShortTokenAmount: BigNumber;
  minMarketTokens: BigNumber;
  updatedAtBlock: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type WithdrawalCreatedEvent = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  market: string;
  marketTokenAmount: BigNumber;
  minLongTokenAmount: BigNumber;
  minShortTokenAmount: BigNumber;
  updatedAtBlock: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  shouldUnwrapNativeToken: boolean;
};

export type MultiTxnStatus<TPayload> = {
  key: string;
  data: TPayload;
  createdTxnHash: string;
  cancelledTxnHash?: string;
  executedTxnHash?: string;
  isTouched?: boolean;
};

export type OrderStatus = MultiTxnStatus<OrderCreatedEvent>;
export type DepositStatus = MultiTxnStatus<DepositCreatedEvent>;
export type WithdrawalStatus = MultiTxnStatus<WithdrawalCreatedEvent>;

export type OrderStatuses = {
  [key: string]: OrderStatus;
};

export type DepositStatuses = {
  [key: string]: DepositStatus;
};

export type WithdrawalStatuses = {
  [key: string]: WithdrawalStatus;
};

export type PendingPositionsUpdates = {
  [key: string]: PendingPositionUpdate | undefined;
};
