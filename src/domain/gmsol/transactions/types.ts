import type { CreateOrderKind, DecreasePositionSwapType } from "@gmsol-labs/gmsol-sdk";

import type { GmsolMarketConfig } from "config/gmsol/markets";

export type GmsolPositionOrderKind = Exclude<CreateOrderKind, "MarketSwap" | "LimitSwap">;

export type GmsolCreateOrder = {
  kind: GmsolPositionOrderKind;
  market: GmsolMarketConfig;
  collateralToken: string;
  indexTokenDecimals: number;
  isLong: boolean;
  sizeDeltaUsd: bigint;
  collateralDeltaAmount: bigint;
  minOutput: bigint;
  acceptablePrice: bigint | undefined;
  triggerPrice: bigint | undefined;
  payToken: string | undefined;
  payWithNativeSol: boolean;
  receiveToken: string | undefined;
  swapPath: string[];
  unwrapNative: boolean;
  validFromTs: number | undefined;
  decreaseSwapType: DecreasePositionSwapType | undefined;
};

// Pass the API order's account context, not a display-only OrderInfo with these fields removed.
export type GmsolOrderAccounts = {
  isLong: boolean;
  address: string;
  marketToken: string;
  owner: string;
  receiver: string;
  rentReceiver: string;
  referrer: string | undefined;
  initialCollateralToken: string | undefined;
  finalOutputToken: string | undefined;
  longToken: string | undefined;
  shortToken: string | undefined;
  unwrapNative: boolean;
  callback: undefined;
};

// Only an update reads the kind, and only position orders can be updated on Solana.
export type GmsolOrderContext = GmsolOrderAccounts & { kind: GmsolPositionOrderKind };

export type GmsolOrderUpdate = {
  kind: GmsolPositionOrderKind;
  indexTokenDecimals: number;
  isLong: boolean;
  sizeDeltaUsd: bigint | undefined;
  acceptablePrice: bigint | undefined;
  triggerPrice: bigint | undefined;
  // Raw token units for increases; application USD (30 decimals) for decreases.
  minOutput: bigint | undefined;
  validFromTs: number | undefined;
};

export type GmsolOrderAction =
  | { type: "create"; orders: GmsolCreateOrder[]; atomic: boolean; existingPositionSizeUsd?: bigint }
  | { type: "update"; order: GmsolOrderContext; changes: GmsolOrderUpdate }
  | { type: "cancel"; order: GmsolOrderAccounts };

export type GmsolLookupTables = Record<string, readonly string[]>;

export type GmsolTransactionLifetime = {
  recentBlockhash: string;
  lastValidBlockHeight: bigint;
  blockhashSlot?: bigint;
};

export type GmsolTransactionPlan = GmsolTransactionLifetime & {
  owner: string;
  action: GmsolOrderAction;
  lookupTables: GmsolLookupTables;
  // Raw lamports in the wallet's WSOL account before building an atomic native-SOL increase.
  wrappedSolBalance: bigint | undefined;
  // Outer groups execute serially; transactions within a group may be independent.
  groups: Uint8Array[][];
  groupLifetimes?: Record<number, GmsolTransactionLifetime>;
  confirmedSlot?: bigint;
};
