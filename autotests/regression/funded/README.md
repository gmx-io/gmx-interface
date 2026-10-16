# Sequential economy funded regression

This opt-in harness has **17 Playwright scenarios across all funded groups**, selected explicitly and executed with **one worker and up to two retries**. It uses the supplied deployment or already running localhost URL; the runner does not build the application or start a server. `funded` defaults to the original smoke. `funded:all` defaults to **16 same-chain scenarios**, excluding the Base bridge for now; same-chain GMX Account and 1CT remain included. An explicit `--case bridge`, `--group bridge` or `--group all` opts into multichain coverage.

**Every paid action in the 17 scenarios starts from the application's forms, settings and transaction buttons.** A guarded injected wallet validates the UI calldata and signatures, checks gas, budgets and reserves, journals before broadcast, and broadcasts classic transactions itself. There is no SDK/API fallback for the tested actions; SDK/RPC reads verify receipts and the resulting inventory. The harness changes or adds to the app's behaviour in three places:

- **Approvals:** the wallet replaces the app's approval amount with a finite one (5 USDC in 1CT mode), so the app's unlimited-approval request is never sent.
- **Relay (Express and 1CT actions, the Base bridge return):** the harness holds the app's `/v1/relay/submit` request until its guards pass and the action is journaled, then sends the app's request to gmx-api unchanged and returns the relay's real response. The app polls the relay status itself. The step continues only after the harness has also confirmed execution and the transaction receipt from Node. A completed step is not sent again on replay; the app receives its recorded task ID.
- **Cleanup:** SDK cleanup runs after every scenario and as pre-run recovery, not only after failures. On passing GM, GLV and claims runs it sends a WETH unwrap transaction, and it rebalances ETH/USDC with an SDK swap when the ratio drifts by more than 5% and $2.

No scenario tests a wallet extension. Earlier user-run mainnet validation belongs to the previous SDK implementation; it does not validate the new UI driver. `funded-ui-rehearsal` runs all 17 UI journeys with simulated transactions, balances and receipts. It creates a disposable in-memory signer for testing signature validation; it never loads `.env.test.local`, uses the funded wallet, broadcasts transactions or contacts a relay for submission. Relay submissions get a simulated task ID, and the app's status polling gets a simulated `executed` status. It does not prove mainnet keeper, relay or bridge execution.

Checkpoints include their UI assertions. A resumed step verifies the submitted action before continuing, and completed steps are not replayed. The rehearsal exercises an interrupted checkpoint after every action and resumes the entire completed journey without additional actions. Paid 1CT retries preserve the same limited session in a `0600` file under the wallet's state directory, outside reports; cleanup revokes it and deletes the file. A lost relay submission response blocks resubmission until its outcome is reconciled.

Local verification on 2026-10-08 used `http://localhost:3041`, one worker, and zero retries. The latest full run passed all 17 cases in 19.1 minutes, with no skips or browser JavaScript errors and no remaining simulated positions/orders. An earlier run passed 15/17 while a network outage interrupted TP/SL wallet restoration and TWAP approval. The driver now waits up to 45 seconds for the form to become ready, keeping the restriction against clicking approval twice; a delayed-allowance browser check failed before this correction and passed afterward. Earlier staking fixture fixes and three consecutive staking/1CT checks are also retained. These are simulated UI results, not funded mainnet results, and one successful full run does not establish that the suite is free of flakiness.

Run the rehearsal against an already running app or deployment:

```sh
REGRESSION_BASE_URL=http://localhost:3041 \
yarn test:regression --project=funded-ui-rehearsal --workers=1 --retries=0
```

| Group       | Cases | Paid operations / assertions                                                                                                      |
| ----------- | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| `smoke`     |     1 | Small ETH/USD long; UI and refresh; full close                                                                                    |
| `trading`   |     2 | Long/short; increase size; add/remove collateral; partial/full close; UI size after each step                                     |
| `orders`    |     6 | Long/short limit and stop creation/edit/cancel; TP and SL management; two-part TWAP first execution and cancellation of remainder |
| `swap`      |     1 | $1 USDC → WETH → USDC; both balance deltas                                                                                        |
| `account`   |     1 | $1 USDC same-chain GMX Account deposit/withdrawal; account balance in UI                                                          |
| `bridge`    |     1 | 3 USDC Base → GMX Account; 2 USDC returned to Base; ~$0.50 ETH bridge-gas deposit and withdrawal of remaining USDC/WETH           |
| `liquidity` |     2 | $1 USDC into GM and GLV; LP mint, portfolio/refresh, withdrawal outputs and empty pending requests                                |
| `earn`      |     2 | Stake/unstake up to $1 of existing GMX; claim existing WETH staking rewards                                                       |
| `one-click` |     1 | One-day / two-action UI authorization; limit creation/cancellation; on-chain activation and revocation                            |

Trading uses ETH/USD [WETH-USDC] on Arbitrum. Liquidity uses that GM market and a compatible ETH/USDC GLV, selected through the pool UI. Trigger orders are placed far from the current price; this verifies creation/edit/cancellation, not natural trigger execution. The guard accepts the application's price sentinels for pending orders, while enforcing the intended trigger, size, collateral, receiver and fees. TWAP creates two parts through the form, verifies the first execution, cancels the remaining part scheduled ten minutes later, and closes the position. GM/GLV forms use 1% slippage; their guard also reserves 0.5% for fees and impact.

Bridge remains excluded from the default sequential batch. It additionally requires 3 USDC and gas on Base. The UI bridge-out pays its network fee from GMX Account USDC and its bridge fee from GMX Account WETH; the journey deposits about $0.50 ETH for that purpose and returns unused WETH/USDC to Arbitrum. Existing account WETH is rejected instead of consumed. A bridge requiring more gas stops at the unchanged spending limits.

Staking requires zero initial GMX/esGMX stake, staking power and projected rewards. The UI acknowledges reset only for power accrued by the test itself. The rehearsal updates both the staked and FeeGmxTracker balances so vesting availability is consistent.

All groups are represented, but Avalanche/other source-chain matrices, synthetic markets, alternative collateral, GM shifts, limit swaps, real TP/SL triggers, GMX Account trading, 1CT top-up, vesting, affiliate/funding/distribution claims and extension/mobile wallet flows are **not covered by these 17 cases**. Controlled fork/mocked suites are appropriate for triggers and entitlement/cooldown variants; they must not be reported as mainnet settlement coverage.

## Historical SDK-driver runs

The user-run mainnet smoke has passed opening, UI/refresh checks and automatic cleanup, reserving about $1.052 in quoted fees. Earlier runs exposed full-close collateral validation, deployed tab-selector and Playwright TypeScript module-loading issues; those were fixed and checked offline. Cleanup closed the test positions, unwrapped WETH and verified empty inventory through both the API and on-chain Reader. Cancellation and rebalance swaps were not exercised by that smoke.

On 2026-10-02, the user-run `market-long` completed all six trading actions (open, increase, collateral deposit/withdrawal, partial/full close), plus approval and unwrap. It took 311 seconds and reserved about $3.073. Playwright reported **flaky**: the first attempt timed out waiting for the UI position row after withdrawal, and the second passed. The journal contains one withdrawal and no repeated completed transactions. Cleanup completed with zero positions/orders. This run also validated the earlier collateral API fix: deposit/withdrawal use the checked contract hash rather than the UI position key.

The browser helper waits up to 45 seconds for wallet connection/restoration and for the position table's `Loading...` state to finish before checking rows, both after navigation and refresh, and before the first paid action. Clicks retain a 15-second limit and navigation a 30-second limit. A header alone does not prove that position data is ready. The failure snapshot already showed the expected position, which is consistent with late UI data; the exact delay in that paid attempt was not traced. After this change, another user-run `market-long` passed without retries in 232 seconds, reserving about $3.088, with successful cleanup.

A subsequent sequential batch passed smoke and all `market-long` trading/UI steps, then failed its first required 50/50 cleanup swap. The API chose a different swap market from the one permitted by the harness. The guard rejected it after ETH had already been wrapped; positions/orders were empty but WETH and an incomplete journal remained. Swap requests now explicitly select the permitted ETH/USDC market and validate the quote/budget before wrapping or approving. Cleanup includes WETH in the ETH allocation, reuses existing WETH, persists the intended amount and balance-cleanup checkpoints, and unwraps only the remainder after the swap. Offline recovery tests cover failed quotes, insufficient budgets and interruptions between wrap, swap and unwrap. The 2026-10-03 user run subsequently completed automatic recovery in 25 seconds, reserving about $0.566 in additional fees. The historical `market-long` failure stays in its report; successful recovery does not change that earlier test result.

The next user-run batch passed smoke, market-long and market-short, then stopped at limit-long creation. The API returned `created` and a transaction hash without `orderKeys`, although the order existed on chain. Creation recovery now reads the successful GMX `OrderCreated` receipt, verifies the wallet, market and key, and persists ownership before retrying or cleaning up. Cancellation receipts record the exact owned keys, so an older creation request can finish recovery even if its API status remains `created`. Receipt recovery and unsigned edit/cancel quotes were verified against the retained real order using a temporary journal; no additional paid actions were submitted during that verification.

On 2026-10-05, automatic recovery completed and all four limit/stop increase scenarios passed with cleanup. The TP/SL journey completed take-profit creation, edit and cancellation, then rejected the stop-loss quote before submission. Cleanup completed with no remaining positions, orders or WETH. The original rejected quote was not retained; offline SDK-shaped quotes reproduce the conflict between stop-loss price sentinels and the old validator. Offline tests cover long/short stop-loss pricing and TP/SL create/edit/cancel retries. The user subsequently confirmed that the corrected paid TP/SL journey passed. Preflight checks the opening quote; the API requires an existing position to prepare the later TP/SL quotes.

On 2026-10-06, TWAP passed with cleanup, reserving about $1.683. The following swap round trip executed both legs, but its return-leg balance assertion rejected a small WETH fee refund and timed out on all attempts. No swaps were repeated; final cleanup unwrapped the refund and completed. Swap checks now verify input and USDC fee debits, the signed minimum output from the selected pool, and exact net token balance changes across creation/execution receipts, including refunds. The signed amounts are journaled before signing, and receipt proofs survive retries and appear in `swapSettlements` in the cost report. Offline interruption tests and read-only replay of both recorded swaps pass. The corrected full funded swap journey passed with cleanup on 2026-10-07.

That 2026-10-07 batch also passed account and GM round trips with cleanup. GLV deposited successfully but failed during settlement checks because the SDK's `getGlvDeposit` ABI could not decode the deployed Reader response; cleanup hit the same error. Read-only checks confirmed 0.709820 GLV in the wallet and no pending GLV deposits or withdrawals. Pending-request checks now use the existing DataStore account request lists, with the request key and wallet verified against a successful creation receipt. Offline tests cover pending requests, cancellation, interrupted round trips and invalid receipts. Unsigned preparation of the recorded GLV withdrawal succeeded with signing disabled and the original journal unchanged. The batch stopped before one-click. Its $5.228 fee reservation was not actual spending, and the approximately $1 held in GLV was excluded from the liquid-balance report until redeemed.

The next user-run batch completed the corrected GLV journey and cleanup in 157 seconds, reserving about $6.794. One-click then rejected creation before any paid action on all three attempts; its cleanup completed with zero positions/orders and zero fee reservations. The harness incorrectly expected the management `SubaccountRouter` as the typed-data verifier. It now uses the SDK's express-router selector, which returns `SubaccountGelatoRelayRouter` for same-chain 1CT orders. A fresh API quote with placeholder approval bytes reproduces the old rejection and passes the corrected checks without generating signatures or submitting transactions. Offline tests verify SDK subaccount signing, approval transition, creation/cancellation, two UI retries without duplicate orders, and revocation; invalid router, wallet, approval and order data remain rejected. The corrected paid one-click journey still requires a run. Bridge, staking and claims also remain unverified.

The following one-click run passed router validation but the relay rejected creation with `InsufficientRelayFee`: 63,929,528,447,360 wei was required versus 62,685,121,314,477 available. Cleanup completed with no order or active subaccount; the balance reduction at starting prices was about $0.0029 for approval gas, while the conservative fee reservation remained $0.473. One-click creation and cancellation now add a 10% margin to the quoted relay payment, rebuilding its typed data only after validating the original quote. The additional amount is included in the unchanged $1 action/$5 run limits. Creation is quoted again after token approval. A fresh unsigned quote validates with the margin and within the action cap; this does not prove relay execution. Failed relay reasons are saved in the journal/cost report and surfaced before browser work on retries, without resubmitting a failed request. Separate read-only browser checks also observed intermittent refresh and position-data loading timeouts. Connection/restoration now receives the same 45-second allowance as other wallet readiness checks; unavailable wallet/data remains a failure before new paid actions.

Free `funded-browser` fixture tests run in regression CI. They cover unavailable deployments, counted tabs, formatted position size, refresh, delayed data, empty states, wrong directions/sizes and order selection. Four additional `funded-runtime` tests run inside Playwright with temporary journals and signing disabled. They also reproduce nested RPC failures inside Playwright, including transaction preparation, with submission blocked. These harness checks are separate from the 17 paid scenarios and add no mainnet settlement coverage.

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

For classic TWAP, the reservation uses the native keeper fees encoded in both orders, estimated protocol costs/negative impact, the existing small buffer and conservative native transaction gas. It does not charge for the unused express relay quote. The $1 action cap remains unchanged, and fee-limit errors include the rejected estimate.

Relay fees already include keeper execution fees. The harness counts that charge once, adds estimated protocol costs/negative impact and a small buffer, and never subtracts expected refunds or positive impact. Rebalancing also reserves the input/output difference allowed by its minimum output. Express orders pay relay fees in USDC; cancellation may require wrapping a bounded amount of ETH if its quote uses WETH. Native approvals/wrapping use bounded fee estimates. The accounting deliberately retains fee reservations after failed or uncertain submissions. The $5 cap concerns quoted fees; it cannot guarantee a cap on market losses or changes in the wallet's ETH value.

## Local commands

Run the 16 default same-chain scenarios sequentially with one command:

```sh
REGRESSION_BASE_URL=https://YOUR-UPDATED-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 yarn test:regression:funded:all --execute --budget-usd 20
```

With `--execute`, this command first recovers any unfinished journal under the wallet lock. Recovery uses the original run's fee profile, remaining budget, ownership checks and gas gates. It writes the old run's report and must complete before any new case starts; an error leaves the journal available for the next recovery attempt. Recovery can spend fees even if the new selection later fails preflight. No journal is deleted or budget reset to bypass a failure.

After recovery, the command checks prerequisites for the entire selection and verifies the deployed wallet connection, refresh and required UI selectors before new test actions. Missing GMX or claimable rewards still block the default batch. Base funding is checked only when bridge coverage is explicitly selected. It then starts a separate run for each case while retaining the same wallet lock for the entire sequence. It keeps one worker, up to two retries and final cleanup for each case. GLV uses its existing standalone $8 profile; the other cases retain their $5 profiles. A failure, incomplete cleanup, interruption or missing fee accounting stops the sequence; later cases remain `not-run`. Reports identify the bridge as excluded from the default selection, never as passed.

For a wallet without GMX or existing rewards, explicitly select the other 14 scenarios:

```sh
REGRESSION_BASE_URL=https://YOUR-UPDATED-PREVIEW.gmx-interface.pages.dev REGRESSION_MAX_GAS_GWEI=0.03 yarn test:regression:funded:all --group smoke,trading,orders,swap,account,liquidity,one-click --execute --budget-usd 20
```

This uses the same preview URL and gas environment variables. To include all 17 again, use `--group all` and set `REGRESSION_BASE_MAX_GAS_GWEI` as well as the bridge prerequisites below.

`--budget-usd` caps **combined fee reservations across all cases**, including retries, cleanup and additional fees reserved during startup recovery. Historical reservations from the previous run are reported separately and are not charged to the new batch again. The previous run's entire remaining allowance must fit this cap before automatic recovery is attempted. The default is $5; the example explicitly permits $20 for the sequence. Before starting each case, the entire $5 allowance (or $8 for GLV) must fit the remaining total budget. This can stop the sequence before the cap is fully used. The cap is not an estimate of actual spending or a guarantee against market losses. A new invocation starts a new batch budget.

Without `--execute`, `yarn test:regression:funded:all --budget-usd 20` reads the wallet, oracle, gas and prerequisites for **every selected case**, prepares unsigned quotes and prints the schedule. It exits nonzero if any prerequisite is missing, including an unfinished journal, and never performs automatic cleanup or sends transactions. Set the deployment URL and explicit gas ceilings for this check. `--case` and `--group` can restrict the sequence, for example to run remaining cases after resolving a failure. Existing wallet, gas, balance and updated-preview requirements below still apply; the command does not fund Base, purchase GMX, create rewards or deploy the UI.

The readiness check uses the maximum $5 collateral allowance when checking ordinary-profile starting reserves ($20 USDC and $5 ETH); the per-run plan also shows the exact opening requirement. This buffer covers later collateral additions. Readiness is not mainnet settlement proof: position-dependent edits, closes and bridge returns still require the preceding action to settle, and prices/fees are rechecked during execution. A $20 batch cap does not guarantee that all 17 cases will fit.

Deployment verification runs in a separate Playwright process, with the two supported private-key variables and execution flag removed from its environment. The same URL is used for the paid cases, with no build or dev server. Its report is `playwright-report/funded-deployment`; failure creates no new funded journal. All public-browser checks use only a read-only injected provider. Position and cancellation assertions now wait for wallet restoration; an empty table while disconnected cannot pass.

Unsigned trigger/TWAP and bridge quotes are validated before approval gas can be spent. Completed 1CT cancellation is recognized on retry, including a later cleanup failure, without reactivating an expired/revoked authorization. Offline tests cover every scenario's prerequisite path and interrupted GM/GLV/account/staking cleanup withdrawals. These checks do not replace mainnet execution.

Executed runs print short progress, retry/failure reasons, cleanup status, fee reservations and balance changes. Full preflight checks and cleanup results/errors are saved in the cost report; the batch report also retains its initial preflight. If a single run fails before creating a journal, its diagnostics are saved as `preflight-<id>.json` beside the wallet journal. Playwright JSON/HTML reports retain every attempt, stack trace, attachment and test stdout/stderr; the terminal does not repeat them. Explicit plan commands still print their detailed read-only plan.

The combined report is `test-results/funded-batch/<batch-id>/summary.json`, also persisted as `batch-<batch-id>.json` beside the wallet journal. It records every selected case's status, duration including cleanup, fee reservations and cleanup result. Per-case cost and Playwright JSON reports are preserved in that batch folder, together with each case's HTML report and its attachments in `<case>-html/`. The summary links to those HTML reports. Batch preflight failures also save a summary before exiting. Playwright reports are checked against their run IDs to avoid reusing stale results. Reservations are distinct from before/after wallet balance measurements.

Use the gitignored `.env.test.local`. The preferred key name is `REGRESSION_PRIVATE_KEY`; the existing `GMX_TEST_PRIVATE_KEY` name is also accepted. Keep the wallet dedicated to this harness; do not run SDK E2E or use it manually at the same time. The main wallet key stays in the Node signer. All 17 cases forward guarded UI requests to it. For 1CT, the application holds the derived session key with the tested two-action/one-day permission; relay payloads are validated before forwarding. Traces and videos are disabled for paid runs.

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

The corrected one-click journey passed on 2026-10-07 with cleanup: $0.708 was reserved and the balance reduction at starting prices was about $0.329. A later 14-case batch passed its smoke journey, including closing the position and unwrapping WETH, but failed during the wrapper's final cleanup. It stopped before the remaining 13 cases. The original cleanup error was redacted too broadly to identify the failed request. Replaying cleanup against a temporary copy of its journal with signing/submission blocked succeeded without another transaction. Wallet snapshots now retry only transient API/RPC/oracle reads, at most twice, and preserve the failed read's name and safe network/status diagnostics. Permanent errors still stop immediately; exhausted reads leave cleanup incomplete. Snapshot freshness is checked after the reads finish. Paid actions are not included in these read retries.

The following 13-case batch passed trading, order management, TWAP, swap, account and GM (11 cases), then stopped at GLV before any paid action; one-click was not run. Every started case completed cleanup. Total balance reduction at each case's starting prices was about $9.814, compared with $16.314 reserved. The first GLV attempt failed on an on-chain positions read; later attempts failed before approval submission, but their underlying request details were not retained. An offline Playwright reproduction showed that viem wraps temporary RPC code -32603 as a contract revert, which the original read retry policy missed. Read diagnostics now recognize nested RPC codes and duplicate module error classes while retaining no raw request data. Liquidity reads, allowance reads and unsigned native transaction preparation use the same bounded read retries. Actual contract reverts, invalid parameters and exhausted retries still fail. Fresh live GLV quotes and unsigned approval preparation passed; that does not validate a new paid GLV run.

## Cleanup and recovery

Both `funded --execute` and `funded:all --execute` first recover unfinished test-owned exposure under the wallet lock. Single-run recovery retains the old run's remaining allowance; its new test run then uses the selected profile's fresh budget. Batch recovery additionally counts its new reservations toward `--budget-usd`. Recovery uses a separate session so an old GLV profile cannot carry over into a new economy run. After recovery, the wrapper records the initial balances for cost accounting and the 50/50 target for cleanup, runs Playwright with up to two retries, and calls cleanup in `finally`, including after assertion failures. New runs require an empty position/order inventory and no WETH. Unowned positions are never swept. Excluding new bridge tests does not skip recovery of an older test-owned bridge transfer; that recovery still needs Base gas and RPC access.

Cleanup reconciles pending requests/receipts first. It revokes the test 1CT authorization, completes a started bridge return, withdraws test GMX Account balances, cancels pending test LP requests / redeems test LP tokens, and unstakes only the recorded stake. It then cancels recorded orders and closes recorded positions into USDC, verifying both API and on-chain Reader state. LP ownership/settlement is checked using creation events, token balances and DataStore account request lists (matching the protocol's [account request keys](https://github.com/gmx-io/gmx-synthetics/blob/main/contracts/data/Keys.sol)). It restores ETH/USDC to **50/50 of the remaining USD value**, counting native ETH and WETH together while planning. A swap reuses available WETH; any remaining WETH is unwrapped afterward. The swap amount and completed balance-cleanup stages survive retries and CLI recovery. It does not attempt to recreate the original amounts after fees/PnL. Small deviations remain to save swap fees. The $10 swap cap, gas gate, fee budget and minimum reserves still apply.

The run journal lives at `~/.local/state/gmx-regression/42161-<address>/active.json`, outside Playwright output directories and shared across local workspaces. It stores request IDs, transaction hashes, ownership and fee reservations, never keys, signatures or RPC credentials. Files are restricted to the OS user. Before broadcasting a native transaction, its hash and fee reservation are persisted; a relay request is recorded before signing/submission. An uncertain action is reconciled, never blindly resent.

Cleanup failure makes the command fail and leaves the journal incomplete. The next paid invocation attempts recovery before starting new tests; explicit `funded:cleanup --execute` remains available. High gas, exhausted budget or unknown exposure still blocks cleanup and must be resolved before continuing. A force-killed process or machine shutdown cannot guarantee cleanup. A retained `lock` file after a hard kill must only be removed after verifying its recorded PID is no longer running. Never delete an incomplete journal to reset the budget.

The Playwright HTML/JSON report includes the selected scenarios and their steps. A green Playwright result alone does not confirm the wrapper cleanup: check its exit status and the journal's `completed` field.

`test-results/funded/cost-report.json` and a durable `report-<run-id>.json` next to the journal contain each case's status, elapsed seconds, action count, conservative fee reservations and measured native receipt gas. The overall report includes final Arbitrum ETH/WETH/USDC values and their change. `changeAtStartPrices` values the final amounts at the starting prices to separate token balance changes from ETH price movement. WETH left by interrupted cleanup is included, so wrapping does not appear as money lost. This remains a portfolio delta, including fees, PnL and transfers, not a fees-only measurement. Reservations are **not actual total spending**; native receipt gas is only one part of the cost, and portfolio value changes include ETH price movement/PnL. Bridge source gas is included in actions; the Arbitrum portfolio value does not include Base balances. Reports are written even when cleanup fails. Cases stopped by a prior failure or budget limit stay `not-run`.

Successful cleanup reports retain final `positions`/`orders` and separate `positionsBefore`/`ordersBefore` counts; the terminal shows only the final counts. `reservedFeesUsd` is the conservative quoted fee reservation, not a measurement of actual spending.

Terminal balance changes identify the run's scenario. The batch summary separately totals all measured case changes at each case's own starting prices, including failed cases. A final case that spent nothing cannot replace earlier spending with zero. Missing measurements produce an unknown total with a measured subtotal. This total includes fees/PnL and excludes pre-run recovery and Base balances; the JSON `balanceChange` field records that scope.

```sh
yarn test:regression:funded:unit
yarn test:regression:funded:types
```
