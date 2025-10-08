import type { TreasuryBalanceEntry } from "./types";

export const TREASURY_EMPTY_RESULT: {
  entries: TreasuryBalanceEntry[];
  totalUsd: bigint;
} = {
  entries: [],
  totalUsd: 0n,
};
