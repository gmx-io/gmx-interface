import type { BorshCoder } from "@coral-xyz/anchor";

import { POSITION_KIND_LONG, POSITION_KIND_SHORT } from "./solanaPositionConstants";
import type { RawSolanaPosition } from "./types";

type BnLike = { toString(): string };

function toBigInt(value: BnLike | undefined, field: string): bigint {
  if (value === undefined || value === null) throw new Error(`position account is missing ${field}`);
  return BigInt(value.toString());
}

function toBase58(value: { toBase58(): string } | undefined, field: string): string {
  if (!value) throw new Error(`position account is missing ${field}`);
  return value.toBase58();
}

/**
 * Decodes a `position` account. Returns undefined for kinds other than Long / Short.
 * Throws when the account does not match the IDL layout.
 */
export function decodeSolanaPosition(
  coder: BorshCoder,
  pubkey: string,
  data: Buffer,
  slot: number
): RawSolanaPosition | undefined {
  const raw = coder.accounts.decode("position", data);
  const kind = Number(raw.kind);
  if (kind !== POSITION_KIND_LONG && kind !== POSITION_KIND_SHORT) return undefined;
  const state = raw.state ?? {};
  return {
    pubkey,
    base64: data.toString("base64"),
    slot,
    owner: toBase58(raw.owner, "owner"),
    marketToken: toBase58(raw.marketToken, "marketToken"),
    collateralToken: toBase58(raw.collateralToken, "collateralToken"),
    kind,
    isLong: kind === POSITION_KIND_LONG,
    sizeInUsd: toBigInt(state.sizeInUsd, "state.sizeInUsd"),
    sizeInTokens: toBigInt(state.sizeInTokens, "state.sizeInTokens"),
    collateralAmount: toBigInt(state.collateralAmount, "state.collateralAmount"),
    borrowingFactor: toBigInt(state.borrowingFactor, "state.borrowingFactor"),
    fundingFeeAmountPerSize: toBigInt(state.fundingFeeAmountPerSize, "state.fundingFeeAmountPerSize"),
    longTokenClaimableFundingAmountPerSize: toBigInt(
      state.longTokenClaimableFundingAmountPerSize,
      "state.longTokenClaimableFundingAmountPerSize"
    ),
    shortTokenClaimableFundingAmountPerSize: toBigInt(
      state.shortTokenClaimableFundingAmountPerSize,
      "state.shortTokenClaimableFundingAmountPerSize"
    ),
    increasedAt: toBigInt(state.increasedAt, "state.increasedAt"),
    decreasedAt: toBigInt(state.decreasedAt, "state.decreasedAt"),
    updatedAtSlot: toBigInt(state.updatedAtSlot, "state.updatedAtSlot"),
    tradeId: toBigInt(state.tradeId, "state.tradeId"),
  };
}
