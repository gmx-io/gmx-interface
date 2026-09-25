// Source: gmx-solana-interface/app/src/hooks/fetchHooks/useOnChainPositions.ts
//
// `position` account layout (bytemuck, little endian):
//   0   discriminator (8)        sha256("account:Position")[0..8] = [170,188,143,228,122,64,247,208]
//   8   version u8
//   9   bump u8
//   10  store pubkey (32)
//   42  kind u8                  1 = Long, 2 = Short
//   43  padding_0 [u8; 5]
//   48  created_at i64
//   56  owner pubkey (32)
//   88  market_token pubkey (32)
//   120 collateral_token pubkey (32)
//   152 state: PositionState

/** base58 of the 8-byte Position account discriminator, used as a memcmp filter at offset 0. */
export const POSITION_DISCRIMINATOR = "VZMoMoKgZQb";
export const POSITION_STORE_OFFSET = 10;
export const POSITION_OWNER_OFFSET = 56;

export const POSITION_KIND_LONG = 1;
export const POSITION_KIND_SHORT = 2;

/** Minimum interval between two manual snapshot refreshes. */
export const POSITION_REFRESH_MIN_INTERVAL_MS = 3000;
