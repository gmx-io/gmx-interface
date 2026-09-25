// Source: gmx-solana-interface/app/src/hooks/fetchHooks/useOrders.ts and the gmsol_store v0.8.0 IDL.
//
// `order` account layout (bytemuck, little endian, 2472 bytes). Offsets include the 8-byte discriminator:
//   0     discriminator (8)            sha256("account:Order")[0..8] = [134,173,223,185,77,86,28,51]
//   8     header: ActionHeader
//   9       action_state u8            0 = Pending, 1 = Completed, 2 = Cancelled
//   24      store pubkey (32)
//   56      market pubkey (32)
//   88      owner pubkey (32)
//   160     updated_at i64
//   168     updated_at_slot u64
//   528   market_token pubkey (32)
//   560   tokens.initial_collateral.token (32)
//   624   tokens.final_output_token.token (32)   PublicKey.default when absent
//   688   tokens.long_token.token (32)
//   752   tokens.short_token.token (32)
//   944   swap.primary_length u8
//   980   swap.paths [pubkey; 10]
//   2104  params.kind u8               see SOLANA_ORDER_KIND
//   2105  params.side u8               0 = Long
//   2112  params.collateral_token (32)
//   2144  params.position (32)         PublicKey.default when absent
//   2176  params.initial_collateral_delta_amount u64
//   2184  params.size_delta_value u128 (USD, 20 decimals)
//   2200  params.min_output u128       amount for swap orders, value for decrease orders
//   2216  params.trigger_price u128    unit price (per smallest index token unit, 20 decimals)
//   2232  params.acceptable_price u128 unit price

/** base58 of the 8-byte Order account discriminator, used as a memcmp filter at offset 0. */
export const ORDER_DISCRIMINATOR = "PXZJQQ2HEmx";
export const ORDER_STORE_OFFSET = 24;
export const ORDER_OWNER_OFFSET = 88;
export const ORDER_ACCOUNT_SIZE = 2472;

/** On-chain `OrderKind` enum (IDL order). Independent from the EVM `OrderType` enum. */
export const SOLANA_ORDER_KIND = {
  Liquidation: 0,
  AutoDeleveraging: 1,
  MarketSwap: 2,
  MarketIncrease: 3,
  MarketDecrease: 4,
  LimitSwap: 5,
  LimitIncrease: 6,
  LimitDecrease: 7,
  StopLossDecrease: 8,
} as const;

export type SolanaOrderKind = (typeof SOLANA_ORDER_KIND)[keyof typeof SOLANA_ORDER_KIND];

export const SOLANA_ORDER_SIDE_LONG = 0;

/** Placeholder used by the program for optional accounts (`PublicKey.default`). */
export const SOLANA_DEFAULT_PUBKEY = "11111111111111111111111111111111";

/** GMTrade polls the order snapshot every 15 s while the Orders tab is active. */
export const ORDER_POLL_INTERVAL_MS = 15_000;
/** Minimum interval between two snapshot refreshes (manual, poll or subscription triggered). */
export const ORDER_REFRESH_MIN_INTERVAL_MS = 3000;

/**
 * Source: gmx-solana-interface/app/src/config/program.ts GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.
 * Prices of these index tokens are shown with a fixed 5 decimals.
 */
export const SOLANA_FOREX_PRECISION_MINTS: ReadonlySet<string> = new Set([
  "Eurzo3GcsjD9sf32gC4RUu8oUVVmFV2oWqCZvfnzshXM",
  "EurdPiuWJazzqJLKE4Amb1ZQxVkpwEiSKCZfNgXC9Wi4",
  "GbpeVg2NBeL9Q2RDLrYkkkRXNMjaXg4vBZbh2cffH7aG",
  "Audg5JLrnh6tRy6WWPRnZ1kh9xiWr2omtP5xdQRTvqQh",
  "NzdGr62wT4t1xoHdYoVMEdWPb1yg9WQp2rQa34sscgJ",
  "jpygxG9g45Lui4P3GQgfdfNSYcR9985HAcxBRPTHr66",
  "cadDuN2bphC1u8K61ZF9hJCshTRmEyVNd4qiMY28ijo",
  "chfdyavofe2ZXsU67oBnruALSgftfTntvDw3MvyEVRs",
  "mxnZft9hb7nH93UxTApmXzk95Fg6BERE1PPRzwg6SLL",
]);
