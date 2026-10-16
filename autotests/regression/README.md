# Release regression — PRO-4345

Playwright coverage for the [release checklist](https://linear.app/gmx-io/document/release-regression-checklist-8b05a61482b0)
and [PRO-4345](https://linear.app/gmx-io/issue/PRO-4345/chore-automate-weekly-release-regression-testing).

Tests open the URL you supply: an existing deployment or a separately started localhost server. The runner does not build the app, start a dev server, load `.env.test.local`, or receive a signing key. The separate [funded runner](funded/README.md) requires explicit execution and keeps its own wallet lock, journal, budgets and cleanup.

## Browser suites

| Project                                                                                       | What it checks                                                                                                                                                                                                                                                                                                | Data and wallet                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui`                                                                                          | Routes, deep links, navigation/back, settings and language persistence, market search/favorites, margin/size calculations, Limit/Stop/TWAP forms, swap forms, chart tabs/timeframes/drawings/order shortcuts, pool composition/sorting, Earn, referrals, trader profile, leaderboard, stats and announcements | No wallet; live public services                                                                                                                              |
| `landing`                                                                                     | Responsive layouts, metrics, VIP/Builders routes and calculators, FAQs, chain/referral handoffs, earn links, header/footer links                                                                                                                                                                              | No wallet; a separately resolved landing preview                                                                                                             |
| `mobile`                                                                                      | Trade, pools, Earn, referrals and announcements; viewport overflow, selector reopening and transitions between mobile/desktop layouts                                                                                                                                                                         | Chromium with Pixel 7 emulation; not a physical device or wallet app                                                                                         |
| `live-state`                                                                                  | Public trade/claims history and CSV, positions/PnL, orders, funding/rebates, GMX Account, GM/GLV balances/earnings, staking/vesting, referrals and rankings; refresh and form validation                                                                                                                      | Public indexers discover accounts; live API/RPC/WebSockets, read-only injected provider; no account/price/flag mocks or signing key                          |
| `connected-state`                                                                             | Connection/network changes, account balances, positions/orders, TWAP grouping/progress, synthetic markets, history pagination, PnL charts/export, limits, TP/SL, GM/GLV, GMX Account and staking forms; unsigned trading/edit/cancel/swap/staking requests and rejected approvals                             | Random public account; mocked account data; live public markets except fixed snapshots for unsigned forms; every signing/submission request is rejected      |
| `gates`                                                                                       | Shipping endpoint hosts, indexer/keeper/API/backend health and freshness, configured market and token sanity on every production chain, release announcement overlap, gas policy failure cases                                                                                                                | Candidate config files, public endpoints and RPC; simulated gas RPC                                                                                          |
| `funded-browser`, `funded-runtime`, `funded-gas-gate` (`yarn test:regression:funded-harness`) | Safety and recovery behavior of the funded harness                                                                                                                                                                                                                                                            | Static fixtures and temporary journals; no funded coverage credit                                                                                            |
| `funded-ui-rehearsal` (`yarn test:regression:funded-harness`)                                 | All 17 funded UI journeys, including orders/TWAP, swap, account/bridge, GM/GLV, staking/claims and 1CT; finite approvals, refresh and retry recovery                                                                                                                                                          | Real app UI with simulated transactions, inventory updates and receipts; disposable signer for signature checks; no funded wallet or mainnet coverage credit |

Connected account fixtures replace feature flags, the selected account's balance reads and positions/orders responses. Wallet and GMX Account balances are separate. History/chart tests also replace that account's indexer responses. Unsigned-request tests use recorded ETH market/price snapshots, token allowances, gas estimates and execution simulation to reach the wallet without owning tokens. The snapshot timestamps advance during replay; prices and pool values stay fixed. These overrides are attached as `unsigned-simulation-fixture`; they do not prove live data availability or transaction execution. Public UI suites and paid funded runs retain live market data.

Mock positions and orders are supplied through the API only. Inventory RPC reads for that random account return an explicit error, so a fallback cannot replace the fixture with the real empty account. Other accounts and ordinary funded wallet fixtures retain their RPC reads. These state tests do not cover API-to-RPC inventory failover. Run `yarn test:regression:fixtures:unit` to verify this isolation, including nested multicalls.

The `connected-state` event stream is empty; polling updates are tested, real event delivery is not. Unsigned-request tests click the real application's forms, decode the resulting wallet request and check its contract, amounts and operation. The provider returns error 4001. It has no private key and never signs or broadcasts. The separate `funded-ui-rehearsal` project supplies simulated successful receipts to exercise the funded UI driver; its report is not mainnet evidence. Browser diagnostics still fail on unhandled JavaScript errors.

Landing builds normally link to `app.gmx.io`. During regression, those navigations are redirected to `REGRESSION_BASE_URL`, preserving the generated path and query. Each test attaches both the original and tested destinations in `landing-app-handoffs`. This exercises the selected pair of previews and does not certify production-host availability.

The browser fixture fails on unhandled JavaScript exceptions and attaches failed-request diagnostics. It does not certify that every console message or public endpoint is error-free.

## Local execution

Use the root Node 22/Yarn installation:

```sh
yarn install --immutable --mode=skip-build
yarn --cwd sdk install --immutable --mode=skip-build
yarn exec playwright install chromium
yarn test:regression:types

REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev \
REGRESSION_LANDING_URL=https://gmx.io \
yarn test:regression
```

For local source changes, set `REGRESSION_BASE_URL=http://localhost:3041` and `REGRESSION_LANDING_URL=http://localhost:3042` after starting those servers. Use separate Vite cache directories when serving app and landing from the same checkout; otherwise one server can invalidate the other's optimized dependencies. Move any generated root `stats.html` report out of the way before starting: Vite otherwise serves it for `/stats`. A localhost run verifies the working tree, not a deployed production bundle.

For a PR, pass its immutable app **and** landing preview URLs. The defaults above are shared deployments and are not associated with a PR commit. The report distinguishes the test-suite checkout from the deployed target.

```sh
# Every test on Avalanche; the default Arbitrum run covers only the tests tagged @avalanche there.
REGRESSION_CHAIN_ID=43114 \
REGRESSION_BASE_URL=https://YOUR_APP_PREVIEW.gmx-interface.pages.dev \
REGRESSION_LANDING_URL=https://YOUR_HOME_PREVIEW.gmx-interface-home.pages.dev \
yarn test:regression

# One suite or a focused debugging run.
yarn test:regression --project=connected-state
yarn test:regression --project=connected-state --grep='reconnects' --retries=0
yarn test:regression:report
```

All projects permit **2 retries: 3 attempts total**. A retry pass remains marked flaky. The default is 2 browser workers; use at most 3. Live-state and the funded runner use 1 worker each. Run resource-intensive checks sequentially across local workspaces. On macOS, `caffeinate -i yarn test:regression ...` prevents idle sleep during a local run and exits with the command.

## Coverage and evidence

Checklist references use `section.item` from the checklist revision inspected on 2026-10-07. A reference identifies related assertions; it does not mean every clause or funded variant is complete. A form check does not cover submission or settlement. Repeating a case on two chains does not double the number of checklist items covered. Harness checks also do not increase app coverage.

Test titles start with the checklist row IDs they verify, and the CI summary lists rows whose tests failed or passed only on retry. On 2026-10-13, `playwright test --list` mapped 297 of the 310 **C** rows to at least one test. A cited row can still be partial; the test title says what it covers. Some tests are registered only when their input exists:

- 0.01 runs when **Run workflow** gets `qa_start_sha`, the commit the QA pass started on, and fails if `src/config/indexers.ts` changed since.
- 2.35 runs when **Run workflow** gets `baseline_run_id`, last release's sign-off run. Each landing section is compared with that run's screenshots at 1920 px and on a phone; live figures are masked. Every run saves its own screenshots under `test-results/baselines/` for the next release.
- 24.04, 24.06 and 23.07 get one test per announcement whose date window is open.

The remaining C rows are release process rather than app behavior (0.05, 0.06, 0.12–0.14), features the app no longer has (3.12, 17.14, 19.07; 5.28 has no confirmation view) and 8.12, whose share links live on the external share service.

Still separate from this coverage:

- Actual execution, keeper settlement, collateral return, rewards and bridge delivery. Mocked account values cannot prove these.
- Real MetaMask/WalletConnect/Privy signing compatibility, extension popups, hardware wallets, physical mobile app switching, and browsers other than Chromium.
- Live WebSocket delivery/recovery, trigger execution at a chosen price, liquidations, and unusual market states unless explicitly simulated in a test.
- Qualitative chart/visual checks, release-specific fixes, deployment/configuration provenance beyond the checked previews, and next-day announcements.

The funded catalog contains 17 scenarios. Every paid action in them starts from the deployed app's UI, with two exceptions: the guarded wallet replaces the app's token approvals with finite amounts, and SDK cleanup runs after every scenario, not only after failures. Express and 1CT relay requests are checked and journaled first, then sent to gmx-api as the app built them; the app gets the relay's real response and polls its status itself. See [funded/README.md](funded/README.md). Prior paid runs used the earlier SDK implementation and do not validate the new UI driver. The no-funds rehearsal runs only on Arbitrum, matching the funded driver's supported chain; it is not included in the Avalanche project list.

## GitHub Actions

`.github/workflows/pr-e2e.yml` runs the non-funded suites (`yarn test:regression`) on request, so pushes to several PRs don't queue full suites at once. Add the `run-e2e` label to a PR (remove and re-add it for a later commit), or once the workflow is on `release`, run it from the Actions tab with the PR number. It waits up to 30 minutes for the head commit's app and landing Cloudflare previews, then runs one Arbitrum run in three shards against those previews. Avalanche is covered by the `avalanche` and `avalanche-live-state` projects in the same run, which execute only the tests tagged `@avalanche` (about a dozen: market and pool config, prices, forms, network switching and a live account); gates already check every production chain. A final job merges the shard reports, uploads the HTML/JSON reports, and posts one PR comment that later runs update. The comment opens with a short summary written through OpenRouter (Claude Opus 5.5 by default; the `OPENROUTER_MODEL` repository variable overrides it) from the failures, flaky tests and the PR's changed files, followed by the deterministic results. Without the `OPENROUTER_API_KEY` repository secret the comment carries only the deterministic results. Fork PRs get the summary in the job summary instead of a comment. A shard stops after 20 failed tests to save runner time; the summary and the comment state how many tests did not run. Connected-state fixtures send their Base, Ethereum and BNB reads to Alchemy when the `REGRESSION_ALCHEMY_KEY` secret (or env variable locally) is set, because public RPCs rate-limit CI runners; the key stays in the test runner and is not recorded in traces.

`.github/workflows/release-regression.yml` runs only when explicitly requested: add the **`run-regression`** PR label or use **Run workflow**. It runs the same suites plus the funded harness checks (`yarn test:regression:funded-harness`), and accepts the release-only inputs described below.

Before this workflow is merged, add `run-regression` to its PR. The label trigger uses the workflow in the PR, resolves the app and landing Cloudflare checks for the requested head SHA, then runs Arbitrum with the Avalanche subset. A manual run with `chain_id=43114` runs every test on Avalanche. Remove/re-add the label to request a run for a new commit. Rerunning an old event after the head changes is rejected.

After the workflow exists on `release`, **Actions → Release regression → Run workflow** accepts a PR number and chain. Optional funded preflight is read-only. Default jobs have no wallet secrets and do not run paid transactions.

The resolver accepts only a successful Cloudflare check for the exact PR head, the expected project, and an immutable preview URL. Branch aliases, other projects, failed deployments and changed/closed PRs fail before the browser starts. Both preview URLs are required in CI. The candidate's endpoint, market and announcement configuration is read from a separate sparse checkout pinned to that head SHA (`REGRESSION_CANDIDATE_ROOT`); candidate install/build scripts are not executed.

Each job uploads HTML/JSON reports, failure screenshots and the trace of each test's first failed attempt for 14 days. The summary separates projects and passed/flaky/failed/skipped counts. Failures, missing reports and skipped prerequisites prevent a green summary. The Cloudflare check links the target to the SHA; it is not an independent inspection of deployed assets.

Validate the resolver without a browser:

```sh
node --test --test-concurrency=3 autotests/regression/ci/resolvePreview.test.cjs
```

## Read-only funded preflight

The manual preflight uses the `regression_e2e` environment. Configure secret `REGRESSION_ARBITRUM_RPC_URL` / `REGRESSION_AVALANCHE_RPC_URL` and positive gas-ceiling variable `REGRESSION_ARBITRUM_MAX_GAS_GWEI` / `REGRESSION_AVALANCHE_MAX_GAS_GWEI`.

Missing configuration, RPC failure, wrong chain, stale block or gas above the ceiling produces a blocked result. There is no default gas threshold. A preflight does not authorize transactions.

```sh
REGRESSION_CHAIN_ID=42161 \
REGRESSION_RPC_URL="$TEST_RPC_URL" \
REGRESSION_MAX_GAS_GWEI="$TEST_MAX_GAS_GWEI" \
yarn test:regression:funded-preflight
```

Funded UI migration must preserve a gas check before every paid action, complete per-action/run fee reservations, cleanup reserve, durable reconciliation before retry, and cleanup restricted to inventory owned by the run. SDK/RPC reads and recovery remain useful; actual tested operations must originate from the deployed UI and be checked against independent on-chain state.

## Free checks with live accounts

```sh
REGRESSION_BASE_URL=http://127.0.0.1:3041 \
REGRESSION_CHAIN_ID=42161 \
yarn test:regression --project live-state --workers=1
```

Start the target server separately, or supply the preview URL. Use `REGRESSION_CHAIN_ID=43114` for Avalanche. The same project is included in the existing manually requested CI regression job. It needs no wallet secret. Ordinary runs retain two retries; use `--retries=0` when checking stability.

The suite uses one worker to limit public RPC load. Three GMX Account checks run only on Arbitrum, where that feature is available. The runner queries the deployment's Subsquid (Goldsky syntheticsStats for GM holders), takes up to 20 candidates and checks at most 12 against public API/RPC data. It selects externally owned accounts with an open position, a pending limit order, staked GMX/esGMX, vesting, a configured GLV or enabled GM balance, executed trade/funding-claim history, an owned referral code, a leaderboard entry, positive accrued funding, claimable USDC funding/rebates, or a positive GMX Account USDC balance. Account addresses are never fixed in the tests. Candidate lists are cached for at most five minutes within a worker (trade/claims history and financial profiles are always refreshed); the selected state is revalidated before every test. CI reads both indexer and GLV configuration from the deployed PR commit.

Public trader history and affiliate dashboards need no connection. Connected checks inject only the selected public address. The wallet forwards allowlisted reads and rejects signing, transaction submission and unknown RPC methods. A browser network guard also rejects transaction broadcasts and relay submissions. It does not replace API, RPC, price, flag or WebSocket responses. The suite never loads `.env.test.local`.

The added read-only assertions cover GM portfolio refresh and sell Max/overbalance checks; GM/GLV lifetime and 7d earnings; staked/wallet esGMX and unstake validation; vesting capacity, existing vested amount and withdrawal availability; loyalty and staking-power share; funding-claim history and CSV download; owned referral codes across dashboard pages, copying their trade links and opening their share cards. Earnings and staking-power values are compared with the unmodified response received by the browser, avoiding a race between two live snapshots. Referral accounts are limited to 400 indexed codes, with at most 40 UI pages searched. Referral ownership and token/staking/vesting amounts are verified with contract reads before the UI starts. Copy/share-card checks do not publish anything.

These assertions relate to checklist rows 10.09, 13.04, 13.09, 13.10, 13.18–13.20 and 15.08, but do not complete every clause of those rows. Claim execution, vesting deposits/withdrawals, complete PnL/APY reconciliation and referral creation remain separate. Live funding/rebate review is covered by the expansion below.

Each report records the profile, address, indexer URL/height, timestamps, checked candidate number and API/RPC evidence. An exhausted candidate search raises `LIVE_DATA_UNAVAILABLE` and fails the run; it never becomes a pass, skip or mocked fallback. After UI assertions start, the test does not switch accounts to hide a failure. Recent profitable trades can open automatic share prompts. The suite uses the UI’s “Don’t show this again” preference, closes the prompt, and records the dismissal in the report. Public owners may still change their state during a test, and external service failures can prevent a run from completing. Passing these checks does not certify live WebSocket recovery or transaction settlement.

| Area                                                                                      | Preferred source                                  | Limitation                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Position/order tables, calculations and form defaults                                     | Subsquid selection, current API state, public RPC | A user can close or modify the selected record during the check              |
| History, fees, claims history and trader dashboard                                        | Indexed executed events plus API and receipts     | Check event identity; several events may share one transaction               |
| GM/GLV portfolio, rewards and cross-page values                                           | Indexed holders, current balances and pool data   | Validate configured pools and balances; rewards/prices change over time      |
| Staking, esGMX, loyalty and vesting                                                       | Indexed stakers plus tracker/vester reads         | Select the exact prerequisite; not every staker has vesting or claims        |
| Common GMX Account balances and referrals                                                 | Indexed accounts plus current public reads        | Dedicated account and referral profiles; account balance requires Arbitrum   |
| Pending/expired 1CT, failed bridges, paused/capped markets, liquidations and RPC failures | Small deterministic fixtures or local fork/replay | A public wallet does not reliably supply a chosen transient or failure state |
| Wallet extensions, signatures, keeper execution and bridge delivery                       | Separate wallet/funded suites                     | A read-only address cannot prove these paths                                 |

### Expanded free browser assertions

The live and wallet-free assertions below use real data only; existing mocked-account suites remain separate.

| Area                | New browser assertions                                                                                                                                                 | Boundary                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trading forms       | Manual leverage limits/slider, independent margin/size inputs, high price-impact warning and recovery, live collateral search/selection, close receive-token selection | No order submission; USD size can move as its stored token quantity reprices                                                                         |
| Positions           | Approximate manual PnL, Trade/public-profile identity and size, margin-editor validation/reset, partial close and Keep leverage/Max                                    | PnL tolerance is 0.1% of notional plus $0.02 for live prices/rounding; existing-position size may change if its owner trades                         |
| Claims              | Funding/rebate market and USDC amount in review; empty market selection blocks claim; accrued funding matches the browser's live response and opens settle review      | Funding amount is read from DataStore; rebate amount is calculated from indexed unclaimed records and RPC timing constants; neither is claimed       |
| GMX Account         | Actual USDC balance, asset search, withdraw Max/overbalance/empty checks, transfer-history search/details and successful transaction explorer link                     | Arbitrum only; balance is verified with DataStore; no deposit, withdrawal or bridge                                                                  |
| Pools/portfolio     | GM TVL/APY sorting, configured GLV listing, GM/GLV composition totals and matching token balances across Pools/Portfolio                                               | Token balances and rounded composition are checked; this does not independently derive every USD/APY figure                                          |
| Leaderboard/profile | Three periods, address search and profile popup, PnL USD/% and average-size sorting, connected rank after refresh, six performance buckets and explanatory tooltips    | Current UI exposes average size, not the volume sort named in checklist 16.02; performance figures are compared with the unmodified indexer response |
| Chart               | Drawing creation/persistence/deletion, context-menu order price, symbol and price consistency                                                                          | Price comparison allows 1%; position/order/TP/SL lines and visual design remain separate                                                             |

All actions are performed through the page. API/RPC reads only select prerequisites or provide expected values; they do not replace clicks with SDK actions. Claims, trade and account review dialogs are dismissed before signing. Read-only wallet guards fail a scenario if it requests a signature or submission. There is no `.env.test.local` access or paid execution in this expansion.

The lifecycle regression controls `pagehide`/`pageshow` events and removes the real chart iframe to reproduce a late marker update during page teardown. Before the fix it fails with `Cannot read properties of null (reading 'tradingViewApi')`. The chart now suspends its widget reference on `pagehide`, restores it on `pageshow`, and ignores readiness callbacks while hidden or disposed. This controlled test does not certify every browser's back-forward cache behavior. Real Claims-page refresh is also rechecked, and unhandled-error diagnostics remain enabled.

Context-menu tests wait for chart data and click the empty right margin away from candles and the price-scale plus button. Close-Max tests wait for the modal's opening animation to finish before interacting. These readiness checks preserve real browser actions and live responses.
