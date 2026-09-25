import type { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { GMX_SOLANA_STORE_ADDRESS, GMX_SOLANA_STORE_PROGRAM_ID } from "../config/solanaProgram";

export type SolanaMarketAccount = {
  address: string;
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  /** Raw account bytes as base64, consumed by `Market.decode_from_base64` in the SDK. */
  base64: string;
  state: {
    minCollateralFactor: bigint;
    minCollateralFactorForLiquidation: bigint;
  };
  slot: number;
};

type BnLike = { toString(): string };

function toBigInt(value: BnLike | undefined, field: string): bigint {
  if (value === undefined || value === null) throw new Error(`market account is missing ${field}`);
  return BigInt(value.toString());
}

function toBase58(value: { toBase58(): string } | undefined, field: string): string {
  if (!value) throw new Error(`market account is missing ${field}`);
  return value.toBase58();
}

/** Market PDA: seeds `["market", store, marketToken]` under the store program. */
export function findSolanaMarketPda(marketToken: string, store = GMX_SOLANA_STORE_ADDRESS): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), new PublicKey(store).toBuffer(), new PublicKey(marketToken).toBuffer()],
    new PublicKey(GMX_SOLANA_STORE_PROGRAM_ID)
  )[0];
}

/** Decodes a `market` account, keeping only what position derivation needs. Throws on layout mismatch. */
export function decodeSolanaMarket(
  coder: BorshCoder,
  address: string,
  data: Buffer,
  slot: number
): SolanaMarketAccount {
  const raw = coder.accounts.decode("market", data);
  const meta = raw.meta ?? {};
  const config = raw.config ?? {};
  return {
    address,
    marketToken: toBase58(meta.marketTokenMint, "meta.marketTokenMint"),
    indexToken: toBase58(meta.indexTokenMint, "meta.indexTokenMint"),
    longToken: toBase58(meta.longTokenMint, "meta.longTokenMint"),
    shortToken: toBase58(meta.shortTokenMint, "meta.shortTokenMint"),
    base64: data.toString("base64"),
    state: {
      minCollateralFactor: toBigInt(config.minCollateralFactor, "config.minCollateralFactor"),
      minCollateralFactorForLiquidation: toBigInt(
        config.minCollateralFactorForLiquidation,
        "config.minCollateralFactorForLiquidation"
      ),
    },
    slot,
  };
}
