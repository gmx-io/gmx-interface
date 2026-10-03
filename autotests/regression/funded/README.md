# Sequential economy funded regression

This opt-in harness has **17 Playwright scenarios across all funded groups**, selected explicitly and executed with **one worker and up to two retries**. It uses a deployed preview URL, with no application build or local server. The default command still selects only the original smoke.

**Transactions are API/contract-assisted, with a read-only injected browser wallet.** These cases verify settlement and selected deployed-UI states; they do not cover clicking the application's transaction buttons, extension signing, or every variant in the release checklist. User-run mainnet validation currently covers the smoke and market-long journeys; the other 15 cases have not yet been validated with real funds. Offline tests and unsigned quotes are separate evidence.

| Group       | Cases | Paid operations / assertions                                                                                                      |
| ----------- | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| `smoke`     |     1 | Small ETH/USD long; UI and refresh; full close                                                                                    |
| `trading`   |     2 | Long/short; increase size; add/remove collateral; partial/full close; UI size after each step                                     |
| `orders`    |     6 | Long/short limit and stop creation/edit/cancel; TP and SL management; two-part TWAP first execution and cancellation of remainder |
| `swap`      |     1 | $1 USDC → WETH → USDC; both balance deltas                                                                                        |
| `account`   |     1 | $1 USDC same-chain GMX Account deposit/withdrawal; account balance in UI                                                          |
| `bridge`    |     1 | 3 USDC Base → Arbitrum GMX Account → Base; destination balances, not only source receipts                                         |
| `liquidity` |     2 | $1 USDC into GM and GLV; LP mint, portfolio/refresh, withdrawal outputs and empty pending requests                                |
| `earn`      |     2 | Stake/unstake up to $1 of existing GMX; claim existing WETH staking rewards                                                       |
| `one-click` |     1 | 10-minute / two-action authorization; limit creation/cancellation; on-chain activation and revocation                             |

Trading uses ETH/USD [WETH-USDC] on Arbitrum. Liquidity uses that GM market and a compatible ETH/USDC GLV. Trigger orders are placed far from the current price; this verifies management, not natural trigger execution. TWAP uses bounded classic calldata because API express TWAP quotes use unlimited acceptable prices. The second part is scheduled ten minutes later and cancelled after the first executes.

All groups are represented, but Avalanche/other source-chain matrices, synthetic markets, alternative collateral, GM shifts, limit swaps, real TP/SL triggers, GMX Account trading, 1CT UI persistence/top-up, vesting, affiliate/funding/distribution claims and extension/mobile wallet flows are **not covered by these 17 cases**. Controlled fork/mocked suites are appropriate for triggers and entitlement/cooldown variants; they must not be reported as mainnet settlement coverage.

The user-run mainnet smoke has passed opening, UI/refresh checks and automatic cleanup, reserving about $1.052 in quoted fees. Earlier runs exposed full-close collateral validation, deployed tab-selector and Playwright TypeScript module-loading issues; those were fixed and checked offline. Cleanup closed the test positions, unwrapped WETH and verified empty inventory through both the API and on-chain Reader. Cancellation and rebalance swaps were not exercised by that smoke.

On 2026-10-02, the user-run `market-long` completed all six trading actions (open, increase, collateral deposit/withdrawal, partial/full close), plus approval and unwrap. It took 311 seconds and reserved about $3.073. Playwright reported **flaky**: the first attempt timed out waiting for the UI position row after withdrawal, and the second passed. The journal contains one withdrawal and no repeated completed transactions. Cleanup completed with zero positions/orders. This run also validated the earlier collateral API fix: deposit/withdrawal use the checked contract hash rather than the UI position key.

The browser helper now waits up to 45 seconds for the position table's `Loading...` state to finish before checking rows, both after navigation and refresh, and before the first paid action. Clicks retain a 15-second limit and navigation a 30-second limit. A header alone does not prove that position data is ready. The failure snapshot already showed the expected position, which is consistent with late UI data; the exact delay in that paid attempt was not traced. After this change, another user-run `market-long` passed without retries in 232 seconds, reserving about $3.088, with successful cleanup.

A subsequent sequential batch passed smoke and all `market-long` trading/UI steps, then failed its first required 50/50 cleanup swap. The API chose a different swap market from the one permitted by the harness. The guard rejected it after ETH had already been wrapped; positions/orders were empty but WETH and an incomplete journal remained. Swap requests now explicitly select the permitted ETH/USDC market and validate the quote/budget before wrapping or approving. Cleanup includes WETH in the ETH allocation, reuses existing WETH, persists the intended amount and balance-cleanup checkpoints, and unwraps only the remainder after the swap. Offline recovery tests cover failed quotes, insufficient budgets and interruptions between wrap, swap and unwrap. A live unsigned quote with the pinned route passed validation within the remaining fee budget; paid recovery of that journal has not yet been verified. Resume it with `funded:cleanup --execute` instead of restarting completed trading steps.

Thirteen free `funded-browser` fixture tests run in regression CI. They cover unavailable deployments, counted tabs, formatted position size, refresh, delayed data, empty states, wrong directions/sizes and order selection. Three additional `funded-runtime` tests run inside Playwright with temporary journals and signing disabled. These harness checks are separate from the 17 paid scenarios and add no mainnet settlement coverage.

```sh
yarn test:regression --project=funded-runtime --project=funded-browser --workers=1
```

## Limits and savings

| Control                   | Economy default                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Settlement chain          | Arbitrum only                                                                                                           |
| Concurrent exposure       | One scenario; one worker                                                                                                |
| Position size             | Live market minimum, with a $2 floor; maximum $10                                                                       |
| Collateral                | Larger of live minimum or amount needed for at most 2x leverage, plus $1 buffer and estimated opening costs; maximum $5 |
| Fees for the whole run    | $5 maximum reserved quotes, shared by retries, approvals and cleanup                                                    |
| Reserved for cleanup      | $2 inside the $5 total; new test actions cannot spend it                                                                |
| Fee per action            | $1 maximum                                                                                                              |
| Remaining wallet reserves | $10 USDC and $5 native ETH                                                                                              |
| Target allocation         | 50% native ETH / 50% USDC by USD value on Arbitrum                                                                      |
| Rebalance tolerance       | No swap below $2 drift or within 5 percentage points of the target                                                      |
| Maximum rebalance         | $10; larger drift requires investigation                                                                                |

The current $1 collateral/$1 position minima yield a roughly $2 position with about $2.50 collateral at a $0.50 opening quote. These values are recomputed; they are not hard-coded protocol minimums. Partial-close scenarios can request sizing for two minimum-size parts. High minimums or expensive fees block the scenario instead of increasing the budget or leverage.

`funded:plan` reports `startingReserves.sufficient`, `requiredUsd` and `shortfallUsd` separately for USDC and ETH. The ordinary profile requires $10 in USDC plus the planned collateral and the full $5 fee budget, and $5 in native ETH. GLV requires $15 in USDC and $13 in native ETH. These are starting-balance requirements, not expected spending. Surplus ETH does not cover a USDC shortfall. A failed starting-reserve check creates no new journal and submits no transaction; the error shows missing assets with amounts rounded conservatively to cents. Small cleanup ratio changes can leave USDC below the next run's requirement because dust rebalances are deliberately avoided.

Prepare the Arbitrum wallet at approximately **50/50 ETH/USDC by USD value** before a new run. `funded:plan` shows `allocation.targetUsd`, `withinTolerance` and the estimated adjustment before fees (`sell-native` means ETH → USDC). It only calculates; it never submits the initial swap. Starting outside the tolerance is blocked before creating a journal or sending transactions, so the first paid case cannot inherit a large setup rebalance. Base balances for bridging are separate. Initial allocation can exceed the $10 cleanup swap cap and must be done separately by the wallet owner.

Each scenario has durable checkpoints, including the balance before an action. An assertion retry reuses the recorded request/transaction; completed steps are not executed again. Cleanup runs between successful scenarios and in the wrapper's `finally` after failures. The 50/50 target and fee reservations survive between scenarios and process restarts. Journals created before explicit targets retain their original allocation during recovery.

The default $5 cap applies to the **whole selected run**, not to each group or retry. `--group all` can exhaust the budget before reaching later cases; it stops and reports them as `not-run`. Use `--case` to run the remaining cases individually after successful cleanup. A new invocation has a new $5 budget, so several invocations can spend more than $5 overall. No command automatically increases the limits.

GLV has an explicit **standalone** `--case glv --fee-profile glv` option: $8 per run, $4 per action and $4 reserved for cleanup within that total. The profile cannot be combined with other cases/groups. It is stored in the journal, so cleanup/retries preserve it without repeating the option. Deposit/withdrawal fee quotes are checked before the first approval. On 2026-09-29, unsigned quotes were approximately $3.19 / $3.14 for GLV keeper fees versus $0.35 / $0.29 for GM, before wallet transaction gas. The default profile correctly blocked GLV. `funded:plan` always shows current quotes; these observations are not fixed execution prices.

Relay fees already include keeper execution fees. The harness counts that charge once, adds estimated protocol costs/negative impact and a small buffer, and never subtracts expected refunds or positive impact. Rebalancing also reserves the input/output difference allowed by its minimum output. Express orders pay relay fees in USDC; cancellation may require wrapping a bounded amount of ETH if its quote uses WETH. Native approvals/wrapping use bounded fee estimates. The accounting deliberately retains fee reservations after failed or uncertain submissions. The $5 cap concerns quoted fees; it cannot guarantee a cap on market losses or changes in the wallet's ETH value.

## Local commands

Run all 17 scenarios sequentially with one command:

```sh
REGRESSION_BASE_URL=https://YOUR-UPDATED-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 REGRESSION_BASE_MAX_GAS_GWEI=0.01 yarn test:regression:funded:all --execute --budget-usd 20
```

Before spending, this command checks prerequisites for the entire selection and verifies the deployed wallet connection, refresh and required UI selectors. Missing Base funds, GMX, claimable rewards, an unfinished journal or an outdated deployment blocks the batch before the first paid case. It then starts a separate run for each case while holding the wallet lock for the entire sequence. It keeps one worker, up to two retries and final cleanup for each case. GLV uses its existing standalone $8 profile; the other cases retain their $5 profiles. A failure, incomplete cleanup, interruption or missing fee accounting stops the sequence; later cases remain `not-run`.

`--budget-usd` caps **combined fee reservations across all cases**, including retries and cleanup. The default is $5; the example explicitly permits $20 for the sequence. Before starting each case, the entire $5 allowance (or $8 for GLV) must fit the remaining total budget. This can stop the sequence before the cap is fully used. The cap is not an estimate of actual spending or a guarantee against market losses. A new invocation starts a new batch budget.

Without `--execute`, `yarn test:regression:funded:all --budget-usd 20` reads the wallet, oracle, gas and prerequisites for **every selected case**, prepares unsigned quotes and prints the schedule. It exits nonzero if any prerequisite is missing. It does not send transactions. Set the deployment URL and explicit gas ceilings for this check. `--case` and `--group` can restrict the sequence, for example to run remaining cases after resolving a failure. Existing wallet, gas, balance and updated-preview requirements below still apply; the command does not fund Base, purchase GMX, create rewards or deploy the UI.

The readiness check uses the maximum $5 collateral allowance when checking ordinary-profile starting reserves ($20 USDC and $5 ETH); the per-run plan also shows the exact opening requirement. This buffer covers later collateral additions. Readiness is not mainnet settlement proof: position-dependent edits, closes and bridge returns still require the preceding action to settle, and prices/fees are rechecked during execution. A $20 batch cap does not guarantee that all 17 cases will fit.

Deployment verification runs in a separate Playwright process, with the two supported private-key variables and execution flag removed from its environment. The same URL is used for the paid cases, with no build or dev server. Its report is `playwright-report/funded-deployment`; failure creates no new funded journal. All public-browser checks use only a read-only injected provider. Position and cancellation assertions now wait for wallet restoration; an empty table while disconnected cannot pass.

Unsigned trigger/TWAP and bridge quotes are validated before approval gas can be spent. Completed 1CT cancellation is recognized on retry, including a later cleanup failure, without reactivating an expired/revoked authorization. Offline tests cover every scenario's prerequisite path and interrupted GM/GLV/account/staking/claims round trips. These checks do not replace mainnet execution.

The combined report is `test-results/funded-batch/<batch-id>/summary.json`, also persisted as `batch-<batch-id>.json` beside the wallet journal. It records every selected case's status, duration including cleanup, fee reservations and cleanup result. Per-case cost and Playwright JSON reports are preserved in that batch folder. Playwright reports are checked against their run IDs to avoid reusing stale results. Reservations are distinct from before/after wallet balance measurements.

Use the gitignored `.env.test.local`. The preferred key name is `REGRESSION_PRIVATE_KEY`; the existing `GMX_TEST_PRIVATE_KEY` name is also accepted. Keep the wallet dedicated to this harness; do not run SDK E2E or use it manually at the same time. Only the Node runner signs; the injected browser wallet permits reads. Traces and videos are disabled for this suite.

The RPC can be set with `REGRESSION_RPC_URL` (or `REGRESSION_ARBITRUM_RPC_URL` / existing `GMX_TEST_RPC_URL`). Without an override it uses the public Arbitrum RPC. **Set an explicit positive `REGRESSION_MAX_GAS_GWEI` or `REGRESSION_ARBITRUM_MAX_GAS_GWEI` before execution. There is no default ceiling.** Gas checks run before every paid action, including cleanup; retries never bypass the gate.

```sh
# List all 17 scenario IDs without loading the wallet env file.
yarn test:regression:funded:list

# Read-only balances, market minima, quote and selected cases.
yarn test:regression:funded:plan --group all

# Also read-only unless --execute is supplied.
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev yarn test:regression:funded

# Select one scenario against the current PR preview containing these changes.
REGRESSION_BASE_URL=https://YOUR-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 yarn test:regression:funded --case market-long --execute

# Groups run serially; all share the same fee budget.
REGRESSION_BASE_URL=https://YOUR-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 yarn test:regression:funded --group all --execute

# Inspect the explicit standalone GLV budget and current quotes first.
yarn test:regression:funded:plan --case glv --fee-profile glv

# GLV alone, with its explicit bounded $8 fee profile.
REGRESSION_BASE_URL=https://YOUR-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 yarn test:regression:funded --case glv --fee-profile glv --execute

# Alternatives with the ordinary profile: --group liquidity / --group account / --case limit-short

# Inspect remaining test-owned exposure after an interruption.
yarn test:regression:funded:cleanup

# Resume cleanup of that same run, with the original remaining fee budget.
yarn test:regression:funded:cleanup --execute
```

Replace example hosts such as `YOUR-UPDATED-PREVIEW` with the real deployment address before execution. The runner rejects these placeholders before opening a funded run. The browser also reports unsuccessful deployment responses and Cloudflare's unavailable-page message directly, before attempting wallet connection.

Use the PR's **updated immutable Cloudflare preview URL**: the new cases need the order/account/portfolio selectors in this change. The public test URL or an older preview may not contain them. CI validates funded types, offline policies and discovery of all 17 Playwright cases. It does not receive the wallet key or run funded transactions; the existing manual PR-label/dispatch workflow still runs the free UI/mock suites against the PR deployment preview.

The bridge case also requires at least **3 USDC plus native ETH on Base**, with $1 of Base ETH retained as a reserve, and an explicit `REGRESSION_BASE_MAX_GAS_GWEI`. Set `REGRESSION_BASE_RPC_URL` if needed (`GMX_TEST_SOURCE_RPC_URL` is also accepted). Arbitrum and Base each have a gas gate; Base fee reservations also include the L1 data-fee upper bound. Bridge return waits up to ten minutes per destination leg. Small residual account USDC is withdrawn on Arbitrum to avoid paying for another bridge.

Staking requires a small existing GMX balance and no pre-existing stake. Claims require accrued WETH staking rewards, limited to $2 per claim in economy mode. Missing prerequisites fail with `BLOCKED`; they are never counted as a skipped/pass case. The runner does not purchase GMX, seed another chain, or manufacture claim entitlements.

## Cleanup and recovery

The wrapper holds a wallet lock, records the initial balances for cost accounting and the 50/50 target for cleanup, runs Playwright with up to two retries, and calls cleanup in `finally`, including after assertion failures. New runs require an empty position/order inventory and no WETH. Existing positions are never swept.

Cleanup reconciles pending requests/receipts first. It revokes the test 1CT authorization, completes a started bridge return, withdraws test GMX Account balances, cancels pending test LP requests / redeems test LP tokens, and unstakes only the recorded stake. It then cancels recorded orders and closes recorded positions into USDC, verifying both API and on-chain Reader state. LP ownership/settlement is checked using creation events and Reader/DataStore requests (matching the protocol's [account request keys](https://github.com/gmx-io/gmx-synthetics/blob/main/contracts/data/Keys.sol)). It restores ETH/USDC to **50/50 of the remaining USD value**, counting native ETH and WETH together while planning. A swap reuses available WETH; any remaining WETH is unwrapped afterward. The swap amount and completed balance-cleanup stages survive retries and CLI recovery. It does not attempt to recreate the original amounts after fees/PnL. Small deviations remain to save swap fees. The $10 swap cap, gas gate, fee budget and minimum reserves still apply.

The run journal lives at `~/.local/state/gmx-regression/42161-<address>/active.json`, outside Playwright output directories and shared across local workspaces. It stores request IDs, transaction hashes, ownership and fee reservations, never keys, signatures or RPC credentials. Files are restricted to the OS user. Before broadcasting a native transaction, its hash and fee reservation are persisted; a relay request is recorded before signing/submission. An uncertain action is reconciled, never blindly resent.

Cleanup failure makes the command fail and leaves the journal incomplete, blocking another run. High gas, exhausted budget or unknown exposure also blocks cleanup and must be resolved before continuing. A force-killed process or machine shutdown cannot guarantee cleanup; rerun the cleanup command. A retained `lock` file after a hard kill must only be removed after verifying its recorded PID is no longer running. Never delete an incomplete journal to reset the budget.

The Playwright HTML/JSON report includes the selected scenarios and their steps. A green Playwright result alone does not confirm the wrapper cleanup: check its exit status and the journal's `completed` field.

`test-results/funded/cost-report.json` and a durable `report-<run-id>.json` next to the journal contain each case's status, elapsed seconds, action count, conservative fee reservations and measured native receipt gas. The overall report includes final Arbitrum ETH/WETH/USDC values and their change. `changeAtStartPrices` values the final amounts at the starting prices to separate token balance changes from ETH price movement. WETH left by interrupted cleanup is included, so wrapping does not appear as money lost. This remains a portfolio delta, including fees, PnL and transfers, not a fees-only measurement. Reservations are **not actual total spending**; native receipt gas is only one part of the cost, and portfolio value changes include ETH price movement/PnL. Bridge source gas is included in actions; the Arbitrum portfolio value does not include Base balances. Reports are written even when cleanup fails. Cases stopped by a prior failure or budget limit stay `not-run`.

Successful cleanup output reports final `positions`/`orders` and separate `positionsBefore`/`ordersBefore` counts. `reservedFeesUsd` is the conservative quoted fee reservation, not a measurement of actual spending.

```sh
yarn test:regression:funded:unit
yarn test:regression:funded:types
```
