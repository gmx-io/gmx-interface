import type { BorshCoder } from "@coral-xyz/anchor";

import { SOLANA_DEFAULT_PUBKEY, SOLANA_ORDER_SIDE_LONG } from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";

type BnLike = { toString(): string };
type PubkeyLike = { toBase58(): string };

function toBigInt(value: BnLike | undefined, field: string): bigint {
  if (value === undefined || value === null) throw new Error(`order account is missing ${field}`);
  return BigInt(value.toString());
}

function toBase58(value: PubkeyLike | undefined, field: string): string {
  if (!value) throw new Error(`order account is missing ${field}`);
  return value.toBase58();
}

/** Source: gmx-solana-interface/client/src/utils/address.ts `optionalAccount`. */
function optionalPubkey(value: PubkeyLike | undefined, field: string): string | undefined {
  const address = toBase58(value, field);
  return address === SOLANA_DEFAULT_PUBKEY ? undefined : address;
}

/**
 * Decodes an `order` account. Returns undefined when `kind` is outside the known enum range.
 * Throws when the account does not match the IDL layout.
 */
export function decodeSolanaOrder(coder: BorshCoder, pubkey: string, data: Buffer, slot: number): RawSolanaOrder | undefined {
  const raw = coder.accounts.decode("order", data);
  const header = raw.header ?? {};
  const params = raw.params ?? {};
  const tokens = raw.tokens ?? {};
  const swap = raw.swap ?? {};

  const kind = Number(params.kind);
  if (!Number.isInteger(kind) || kind < 0 || kind > 8) return undefined;

  const primaryLength = Number(swap.primaryLength ?? 0);
  const paths: PubkeyLike[] = Array.isArray(swap.paths) ? swap.paths : [];

  return {
    pubkey,
    slot,
    owner: toBase58(header.owner, "header.owner"),
    store: toBase58(header.store, "header.store"),
    marketToken: toBase58(raw.marketToken, "marketToken"),
    actionState: Number(header.actionState ?? 0),
    kind,
    isLong: Number(params.side) === SOLANA_ORDER_SIDE_LONG,
    positionAddress: optionalPubkey(params.position, "params.position"),
    initialCollateralToken: toBase58(tokens.initialCollateral?.token, "tokens.initialCollateral.token"),
    collateralToken: toBase58(params.collateralToken, "params.collateralToken"),
    longToken: toBase58(tokens.longToken?.token, "tokens.longToken.token"),
    shortToken: toBase58(tokens.shortToken?.token, "tokens.shortToken.token"),
    finalOutputToken: optionalPubkey(tokens.finalOutputToken?.token, "tokens.finalOutputToken.token"),
    sizeDeltaUsd: toBigInt(params.sizeDeltaValue, "params.sizeDeltaValue"),
    initialCollateralDeltaAmount: toBigInt(params.initialCollateralDeltaAmount, "params.initialCollateralDeltaAmount"),
    triggerPrice: toBigInt(params.triggerPrice, "params.triggerPrice"),
    acceptablePrice: toBigInt(params.acceptablePrice, "params.acceptablePrice"),
    minOutputAmount: toBigInt(params.minOutput, "params.minOutput"),
    primarySwapPath: paths.slice(0, primaryLength).map((key) => key.toBase58()),
    updatedAt: toBigInt(header.updatedAt, "header.updatedAt"),
    updatedAtSlot: toBigInt(header.updatedAtSlot, "header.updatedAtSlot"),
  };
}
