/* eslint-disable @typescript-eslint/no-namespace */
import { Token } from "domain/tokens";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { LongCrossChainTask } from "./LongCrossChainTask";

type FundsLeftIn = "source" | "lz" | "gmx-lz" | "unknown";

export class BridgeInFailed extends Error {
  readonly name = "BridgeInFailed";
  readonly chainId: number;
  readonly creationTx: string | undefined;
  readonly fundsLeftIn: FundsLeftIn;

  constructor({
    chainId,
    creationTx,
    fundsLeftIn,
  }: {
    chainId: number;
    creationTx?: string;
    fundsLeftIn: FundsLeftIn;
  }) {
    super("Bridge in failed");
    this.chainId = chainId;
    this.creationTx = creationTx;
    this.fundsLeftIn = fundsLeftIn;
  }
}

export class ConversionFailed extends Error {
  readonly name = "ConversionFailed";
  readonly chainId: number;
  readonly operation: Operation;
  readonly creationTx: string | undefined;
  readonly executionTx: string | undefined;
  readonly operationKey: string | undefined;
  constructor({
    chainId,
    operation,
    creationTx,
    executionTx,
    operationKey,
  }: {
    chainId: number;
    operation: Operation;
    creationTx?: string;
    executionTx?: string;
    operationKey?: string;
  }) {
    super("Conversion failed");
    this.chainId = chainId;
    this.operation = operation;
    this.creationTx = creationTx;
    this.executionTx = executionTx;
    this.operationKey = operationKey;
  }
}
class BridgeOutFailed extends Error {
  readonly name = "BridgeOutFailed";
  readonly chainId: number;
  readonly executionTx: string | undefined;
  constructor({ chainId, executionTx }: { chainId: number; executionTx?: string }) {
    super("Bridge out failed");
    this.chainId = chainId;
    this.executionTx = executionTx;
  }
}

type MultichainTransferError = BridgeInFailed | ConversionFailed | BridgeOutFailed;

const MultichainTransferError = {
  BridgeInFailed,
  ConversionFailed,
  BridgeOutFailed,
} as const;

export abstract class MultichainTransferProgress<
  Step extends string | "finished" = "finished",
  Group extends string | undefined = undefined,
> extends LongCrossChainTask<Step, Group, MultichainTransferError> {
  static readonly errors = MultichainTransferError;
  abstract readonly isGlv: boolean;
  abstract readonly operation: Operation;
  readonly token: Token;
  readonly amount: bigint;

  constructor(params: {
    sourceChainId: number;
    initialTxHash: string;
    token: Token;
    amount: bigint;
    settlementChainId: number;
  }) {
    super(params.initialTxHash, params.sourceChainId, params.settlementChainId);

    this.token = params.token;
    this.amount = params.amount;
  }
}

export namespace MultichainTransferProgress {
  export type errors = MultichainTransferError;
}
