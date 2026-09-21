import type { PendingOrderData } from "context/SyntheticsEvents/types";

export type PendingTpSlOrderBatch = {
  id: string;
  chainId: number;
  orders: (PendingOrderData & { isConfirmed?: boolean })[];
  existingOrderKeys: string[];
  transactionHash?: string;
  relayTaskId?: string;
};

export type PendingTpSlOrder = PendingOrderData & { id: string };
