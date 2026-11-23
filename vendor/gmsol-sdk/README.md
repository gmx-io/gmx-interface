# GMX-Solana

[![Crates.io](https://img.shields.io/crates/v/gmsol-sdk.svg)](https://crates.io/crates/gmsol-sdk)
[![Docs.rs](https://docs.rs/gmsol-sdk/badge.svg)](https://docs.rs/gmsol-sdk)
[![npm](https://img.shields.io/npm/v/@gmsol-labs/gmsol-sdk.svg)](https://www.npmjs.com/package/@gmsol-labs/gmsol-sdk)
[![Build Status][actions-badge]][actions-url]

[Examples](https://github.com/gmsol-labs/gmx-solana/tree/main/examples)

[actions-badge]: https://img.shields.io/github/actions/workflow/status/gmsol-labs/gmx-solana/ci-sdk.yml?label=CI
[actions-url]: https://github.com/gmsol-labs/gmx-solana/actions?query=branch%3Amain

## Audits

| Program                    | Last Audit Date | Version   |
| -------------------------- | --------------- | --------- |
| [gmsol-store]              | [2026-10-09]    | [8af1e70] |
| [gmsol-treasury]           | [2026-10-09]    | [8af1e70] |
| [gmsol-timelock]           | [2026-10-09]    | [8af1e70] |
| [gmsol-competition]        | [2026-10-09]    | [8af1e70] |
| [gmsol-liquidity-provider] | [2026-10-09]    | [8af1e70] |

[gmsol-store]: https://github.com/gmsol-labs/gmx-solana/tree/main/programs/store
[gmsol-treasury]: https://github.com/gmsol-labs/gmx-solana/tree/main/programs/treasury
[gmsol-timelock]: https://github.com/gmsol-labs/gmx-solana/tree/main/programs/timelock
[gmsol-competition]: https://github.com/gmsol-labs/gmx-solana/tree/main/programs/competition
[gmsol-liquidity-provider]: https://github.com/gmsol-labs/gmx-solana/tree/main/programs/liquidity-provider
[2026-10-09]: https://github.com/gmsol-labs/gmx-solana-audits/blob/main/GMX_Solana_Audit_Report_October_9_2026_Zenith.pdf
[8af1e70]: https://github.com/gmsol-labs/gmx-solana/tree/8af1e70c0c0b6ff9d6b41ba4997910588fbcec28

## Integration

### Method 1: Using the Rust SDK

Add the following to your `Cargo.toml`:

```toml
[dependencies]
gmsol-sdk = { version = "0.10", features = ["client"] }
```

Create a `Client` and start using the core APIs:

```rust
use gmsol_sdk::{
    Client,
    ops::ExchangeOps,
    solana_utils::{
        cluster::Cluster,
        solana_sdk::{pubkey::Pubkey, signature::read_keypair_file},
    },
};

let keypair =
    read_keypair_file(std::env::var("KEYPAIR")?)?;
let market_token: Pubkey = std::env::var("MARKET_TOKEN")?.parse()?;

let client = Client::new(Cluster::Mainnet, &keypair)?;
let store = client.find_store_address("");

let (txn, order) = client
    .market_increase(
        &store,
        &market_token,
        true,
        5_000_000,
        true,
        500_000_000_000_000_000_000,
    )
    .build_with_address()
    .await?;

let signature = txn.send().await?;
```

### Method 2: Using `declare_program!`

#### 1. Initialize a new Rust project and add dependencies

Create a new Rust project and include `anchor_lang` and `bytemuck` as dependencies:

```toml
[dependencies]
anchor-lang = "0.31.1"
bytemuck = { version = "1.19.0", features = ["min_const_generics", "derive"] }
```

#### 2. Download and Store IDLs in `{PROJECT_ROOT}/idls/`

You can retrieve the IDLs using the `anchor` CLI or download them directly from the explorer ([`gmsol-store` Program][store-program-link] and [`gmsol-treasury` Program][treasury-program-link]).

Once downloaded, move them to the `{PROJECT_ROOT}/idls/` directory.

Your project structure should now look like this:

```bash
{PROJECT_ROOT}/
├── .gitignore
├── Cargo.lock
├── Cargo.toml
├── idls
│   ├── gmsol_store.json
│   └── gmsol_treasury.json
└── src
    └── lib.rs
```

#### 3. Declaring Programs in `lib.rs`

Use `declare_program!` to register the `gmsol-store` and `gmsol-treasury` programs:

```rust
use anchor_lang::declare_program;

declare_program!(gmsol_store);
declare_program!(gmsol_treasury);
```

#### 4. Build and Open the Documentation

Run the following command to generate and view the documentation:

```bash
cargo doc --open
```

If the build is successful, it will automatically open the documentation in your default web browser.

#### 5. Example Project

For a working implementation, check out the [gmx-solana-programs][gmx-solana-programs-link].

[store-program-link]: https://explorer.solana.com/address/Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo/anchor-program
[treasury-program-link]: https://explorer.solana.com/address/GTuvYD5SxkTq4FLG6JV1FQ5dkczr1AfgDcBHaFsBdtBg/anchor-program
[gmx-solana-programs-link]: https://github.com/gmsol-labs/gmx-solana-programs

## Known Issues

### Keepers

- Order keepers can use prices from different timestamps for limit orders with a swap, which would lead to different output amounts.

- Order Keepers are expected to select an execution fee that does not exceed the actual network fee incurred. In addition, the execution fee that the Order Keeper can specify is capped by the program. Even if the actual network fee incurred exceeds this cap, it will not affect the executability of the request.

- A malicious Order Keeper could potentially profit consistently by manipulating the execution order of orders, but this risk can be mitigated by deploying a sufficient number of high-frequency and trusted Order Keepers, since a successful attack would require the malicious Order Keeper to ensure that the orders it creates are not executed within the valid price time window, which is typically 30 seconds.

- A malicious Order Keeper could potentially extract rent paid by other Order Keepers by closing claimable accounts created by them. However, since claimable accounts are typically created and closed within the same transaction that executes the order, such situations are extremely rare.

- Orders may be prevented from execution by a malicious user intentionally causing a market to be unbalanced resulting in a high price impact, this should be costly and difficult to benefit from.

### Price Impact

- Price impact can be reduced by using positions and swaps and trading across markets, chains, forks, other protocols, this is partially mitigated with virtual inventory tracking.

- A user can reduce price impact by using high leverage positions, this is partially mitigated with the MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER value.

- Calculation of price impact values do not account for fees and the effects resulting from the price impact itself, for most cases the effect on the price impact calculation should be small.

### Market Token Price

- It is rare but possible for a pool's value to become negative, this can happen since the impactPoolAmount and pending PnL is subtracted from the worth of the tokens in the pool.

- Due to the difference in positive and negative position price impact, there can be a build up of virtual token amounts in the position impact pool which would affect the pricing of market tokens, the position impact pool should be gradually distributed if needed.

### Virtual Inventory

- Virtual inventory (for swap) tracks the amount of tokens in pools, it must be ensured that the tokens in each grouping are the same type and have the same decimals, i.e. the long tokens across pools in the group should have the same decimals, the short tokens across pools in the group should have the same decimals, assuming USDC has 6 decimals and WBTC has 8 decimals, markets like WSOL-USDC, WSOL-WBTC should not be grouped.

### GLV

- The GLV shift feature can be exploited by temporarily increasing the utilization in a market that typically has low utilization. Once the keeper executes the shift, the attacker can lower the utilization back to its normal levels. Position fees and price impact should be configured in a way that makes this attack expensive enough to cover the GLV loss.

- In GLV there may be GM markets which are above their maximum pnl_to_pool_factor_for_traders. If this GM market's max_pnl_factor_for_deposits is higher than max_pnl_factor_for_traders then the GM market is valued lower during deposits than it will be once traders have realized their capped profits. Malicious user may observe a GM market in such a condition and deposit into the GLV containing it in order to gain from ADLs which will soon follow. To avoid this max_pnl_factor_for_deposits should be less than or equal to max_pnl_factor_for_traders.

- It's technically possible for market value to become negative. In this case the GLV would be unusable until the market value becomes positive.

- GM tokens could become illiquid due to high pnl factor or high reserved usd. Users can deposit illiquid GM tokens into GLV and withdraw liquidity from a different market, leaving the GLV with illiquid tokens. The glv_max_market_token_value and glv_max_market_token_amount parameters should account for the riskiness of a market to avoid having too many GM tokens from a risky market.

## Development

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana v2.1.21](https://docs.anza.xyz/cli/install)
- [Anchor v0.31.1](https://www.anchor-lang.com/docs/installation)
- [Node](https://nodejs.org/en/download)
- [Just](https://github.com/casey/just?tab=readme-ov-file#installation)

### Commands

To run all tests:

```bash
just
```

To use the `gmsol` CLI in development mode:

```bash
just cli
```

To install the `gmsol` CLI:

```bash
just install-cli
```

Use the following command to verify the CLI is installed properly:

```bash
gmsol -V
```

### Troubleshooting

#### 1. Failed to start `test-validator` on MacOS

**Error Message:**

```bash
Error: failed to start validator: Failed to create ledger at test-ledger: io error: Error checking to unpack genesis archive: Archive error: extra entry found: "._genesis.bin" Regular
```

**Posssible Solution:**

Check [this comment](https://github.com/solana-labs/solana/issues/35629#issuecomment-2501133871).
