import { ErrorLike } from "lib/errors";

export enum TxnEventName {
  Simulated = "Simulated",
  Prepared = "Prepared",
  Sent = "Sent",
  Minted = "Minted",
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

  Prepared() {
    return this._build(TxnEventName.Prepared, {});
  }

  Sent({ txnHash, blockNumber, createdAt }: { txnHash: string; blockNumber: bigint; createdAt: number }) {
    return this._build(TxnEventName.Sent, { txnHash, blockNumber, createdAt });
  }

  Minted() {
    return this._build(TxnEventName.Minted, {});
  }
}
