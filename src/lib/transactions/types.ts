import { TaskState } from "@gelatonetwork/relay-sdk";

import { ErrorLike } from "lib/errors";

export type TransactionWaiterResult = {
  relayStatus:
    | {
        taskId: string;
        taskState: TaskState;
      }
    | undefined;
  transactionHash: string | undefined;
  blockNumber: number | undefined;
  status: "success" | "failed";
};

export type GelatoTaskStatus = {
  chainId: number;
  taskId: string;
  taskState: TaskState;
  creationDate: string;
  lastCheckDate?: string;
  lastCheckMessage?: string;
  transactionHash?: string;
  blockNumber?: number;
  executionDate?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
};

export enum TxnEventName {
  Simulated = "Simulated",
  Sending = "Sending",
  Sent = "Sent",
  Error = "Error",
}

export type TxnCallback<TParams> = (event: TxnEvent<TParams>) => void;
export type TxnEvent<TParams> = ReturnType<TxnEventBuilder<TParams>[TxnEventName]>;

export class TxnEventBuilder<TParams> {
  constructor(public ctx: TParams) {}

  _build<TName extends TxnEventName, TData>(name: TName, eventData: TData) {
    return {
      event: name,
      data: {
        ...this.ctx,
        ...eventData,
      },
    };
  }

  extend<TExtend>(event: TxnEvent<TExtend>) {
    return {
      event: event.event,
      data: {
        ...this.ctx,
        ...event.data,
      },
    } as TxnEvent<TExtend & TParams>;
  }

  Error(error: ErrorLike) {
    return this._build(TxnEventName.Error, { error });
  }

  Simulated() {
    return this._build(TxnEventName.Simulated, {});
  }

  Sending() {
    return this._build(TxnEventName.Sending, {});
  }

  Sent(params: { type: "wallet"; transactionHash: string } | { type: "relay"; relayTaskId: string }) {
    return this._build(TxnEventName.Sent, params);
  }
}
