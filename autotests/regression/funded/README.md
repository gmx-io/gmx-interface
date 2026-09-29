# Economy funded smoke

This opt-in Arbitrum harness is designed for a roughly $100 test wallet. It opens one small ETH/USD position using the SDK API, checks the real position in the deployed UI and after refresh, then closes it. **The order is API-assisted setup; this does not test the Trade button or real extension signing.** The existing UI/mock suites continue without funds.

Paid execution has not yet been validated on mainnet. The policy, payload checks, retry behavior and cleanup failure paths are tested without funds. The read-only plan has been checked against live market quotes. No application build or local server is needed.

## Limits and savings

| Control                   | Economy default                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Settlement chain          | Arbitrum only                                                                                                           |
| Concurrent exposure       | One position; one worker                                                                                                |
| Position size             | Live market minimum, with a $2 floor; maximum $10                                                                       |
| Collateral                | Larger of live minimum or amount needed for at most 2x leverage, plus $1 buffer and estimated opening costs; maximum $5 |
| Fees for the whole run    | $5 maximum reserved quotes, shared by retries, approvals and cleanup                                                    |
| Reserved for cleanup      | $2 inside the $5 total; new test actions cannot spend it                                                                |
| Fee per action            | $1 maximum                                                                                                              |
| Remaining wallet reserves | $10 USDC and $5 native ETH                                                                                              |
| Rebalance tolerance       | No swap below $2 drift or within 5 percentage points of the initial value ratio                                         |
| Maximum rebalance         | $10; larger drift requires investigation                                                                                |

The current $1 collateral/$1 position minima yield a roughly $2 position with about $2.50 collateral at a $0.50 opening quote. These values are recomputed; they are not hard-coded protocol minimums. Partial-close scenarios can request sizing for two minimum-size parts. High minimums or expensive fees block the scenario instead of increasing the budget or leverage.

Reuse one paid setup for display/refresh assertions. Retry reuses the same recorded position rather than opening again. API quote variations and invalid input checks should remain read-only. Limit/stop trigger execution and large TWAP matrices belong in controlled environments; a funded scenario should pay only for the specific settlement behavior it verifies.

Relay fees already include keeper execution fees. The harness counts that charge once, adds estimated protocol costs/negative impact and a small buffer, and never subtracts expected refunds or positive impact. Rebalancing also reserves the input/output difference allowed by its minimum output. Orders pay relay fees in USDC; cancellation may require wrapping a bounded amount of ETH if its quote uses WETH. Native approvals/wrapping use bounded fee estimates. The accounting deliberately retains fee reservations after failed or uncertain submissions. The $5 cap concerns quoted fees; it cannot guarantee a cap on market losses or changes in the wallet's ETH value.

## Local commands

Use the gitignored `.env.test.local`. The preferred key name is `REGRESSION_PRIVATE_KEY`; the existing `GMX_TEST_PRIVATE_KEY` name is also accepted. Keep the wallet dedicated to this harness; do not run SDK E2E or use it manually at the same time. Only the Node runner signs; the injected browser wallet permits reads. Traces and videos are disabled for this suite.

The RPC can be set with `REGRESSION_RPC_URL` (or `REGRESSION_ARBITRUM_RPC_URL` / existing `GMX_TEST_RPC_URL`). Without an override it uses the public Arbitrum RPC. **Set an explicit positive `REGRESSION_MAX_GAS_GWEI` or `REGRESSION_ARBITRUM_MAX_GAS_GWEI` before execution. There is no default ceiling.** Gas checks run before every paid action, including cleanup; retries never bypass the gate.

```sh
# Read-only balances, market minima and quote; no signature or submission.
yarn test:regression:funded:plan

# Also read-only unless --execute is supplied.
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev yarn test:regression:funded

# Paid smoke against an already deployed preview. Requires the explicit gas ceiling.
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev yarn test:regression:funded --execute

# Inspect remaining test-owned exposure after an interruption.
yarn test:regression:funded:cleanup

# Resume cleanup of that same run, with the original remaining fee budget.
yarn test:regression:funded:cleanup --execute
```

Use the PR's immutable Cloudflare preview URL when validating a PR. CI currently runs only the offline policy tests and type checks; it does not receive the wallet key or execute this paid command.

## Cleanup and recovery

The wrapper holds a wallet lock, records the initial ETH/USDC value ratio, runs Playwright with up to two retries, and calls cleanup in `finally`, including after assertion failures. New runs require an empty position/order inventory and no WETH. Existing positions are never swept.

Cleanup reconciles pending requests/receipts first, cancels only recorded test orders, waits for cancellation, closes only recorded test positions into USDC, then verifies the inventory against both the API and the on-chain Reader. It unwraps test WETH and restores the initial ETH/USDC ratio of the **remaining** balance within the tolerance above. It does not attempt to recreate the original amounts after fees/PnL. Small deviations remain to save swap fees.

The run journal lives at `~/.local/state/gmx-regression/42161-<address>/active.json`, outside Playwright output directories and shared across local workspaces. It stores request IDs, transaction hashes, ownership and fee reservations, never keys, signatures or RPC credentials. Files are restricted to the OS user. Before broadcasting a native transaction, its hash and fee reservation are persisted; a relay request is recorded before signing/submission. An uncertain action is reconciled, never blindly resent.

Cleanup failure makes the command fail and leaves the journal incomplete, blocking another run. High gas, exhausted budget or unknown exposure also blocks cleanup and must be resolved before continuing. A force-killed process or machine shutdown cannot guarantee cleanup; rerun the cleanup command. A retained `lock` file after a hard kill must only be removed after verifying its recorded PID is no longer running. Never delete an incomplete journal to reset the budget.

```sh
yarn test:regression:funded:unit
yarn test:regression:funded:types
```
