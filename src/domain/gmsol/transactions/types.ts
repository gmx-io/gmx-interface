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
export type GmsolOrderContext = {
  kind: GmsolPositionOrderKind;
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
  | { type: "create"; orders: GmsolCreateOrder[]; atomic: boolean }
  | { type: "update"; order: GmsolOrderContext; changes: GmsolOrderUpdate }
  | { type: "cancel"; order: GmsolOrderContext };

export type GmsolLookupTables = Record<string, readonly string[]>;

export type GmsolTransactionPlan = {
  owner: string;
  action: GmsolOrderAction;
  recentBlockhash: string;
  lastValidBlockHeight: bigint;
  lookupTables: GmsolLookupTables;
  // Outer groups execute serially; transactions within a group may be independent.
  groups: Uint8Array[][];
};
