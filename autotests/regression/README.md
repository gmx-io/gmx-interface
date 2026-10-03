# Release regression — PRO-4345

Initial Playwright coverage for the [release checklist](https://linear.app/gmx-io/document/release-regression-checklist-8b05a61482b0)
and [PRO-4345](https://linear.app/gmx-io/issue/PRO-4345/chore-automate-weekly-release-regression-testing).
This suite is a first slice, not a complete release sign-off. The default suite covers public UI, mock-wallet states, indexers and gas-guard logic with simulated RPC responses. The separate live gas preflight is read-only and does not need a funded wallet. The opt-in [funded suites](funded/README.md) have 17 sequential Playwright scenarios across trading/orders, swaps, GMX Account, bridges, GM/GLV, staking/claims and 1CT, with one shared fee budget and durable cleanup. The original smoke's first user-run opening/browser checks and resumed cleanup passed on mainnet after a close-quote validation fix. The user-run market-long lifecycle also passed; the other 15 cases have not yet been verified with funds. They use API/contract-assisted actions and a read-only browser wallet; they do not cover UI-driven transaction submission or the full funded checklist.

## Validation observations

On 2026-09-25, local Playwright runs against PR #2944's [immutable preview](https://196bf606.gmx-interface.pages.dev) at commit `12f0f4491e3f0d1da412fef126787d503e0ba467` passed **28/28 on Arbitrum and 28/28 on Avalanche**, with no flakes or skips. These are 28 checks repeated on two chains, not 56 distinct checklist scenarios. No funds, signatures or transactions were used, and the optional live gas preflight was not enabled.

Reconnect after refresh passed on both chains. An earlier local production build had failed that assertion with the mock provider; it was not reproduced on this deployed preview. No wallet-restoration code was changed, and real-extension compatibility is still unverified.

Run the reconnect check against an existing deployment:

```sh
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev \
yarn test:regression --project=connected-state --grep=RR-03-13 --retries=0
```

Use the HTML report to inspect any failure screenshot, trace and `mock-wallet-state` attachment.

## Suites and current coverage

| Project                              | Coverage                                                                                                                                                                         | Wallet/data                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ui`                                 | Eight public routes, sidebar/back navigation, legacy hash routing, 404 recovery, theme persistence, TWAP settings persistence, referral links, Short/Limit/Market form switching | No wallet; live public HTTP services                                                                   |
| `connected-state`                    | Privy connection, displayed address/network, reconnect after refresh, disconnect, empty positions/orders, insufficient-balance submission prevention                             | Fresh mock EIP-1193 account; zero wallet balance; empty mocked WebSocket event stream; live HTTP reads |
| `gates`                              | Production subsquid URL tags and GraphQL availability on Arbitrum/Avalanche/MegaETH; negative tests for the gas guard                                                            | No wallet; live indexers, simulated RPC responses for gas-guard tests                                  |
| `funded-browser`                     | Thirteen harness checks: deployment errors, counted tabs, position size/direction, refresh, delayed data, empty-state readiness and order selection                              | Static HTML fixtures; no wallet, RPC or transactions                                                   |
| `funded-runtime`                     | Three checks in the actual Playwright worker: cleanup/restart, bridge reconciliation and missing TWAP receipt ownership                                                          | Temporary journals, public dummy key, mocked state; signing and paid actions rejected                  |
| `funded-preflight` (separate config) | Live RPC network/freshness and configured gas ceiling                                                                                                                            | Read-only; no signer, private key, or transactions                                                     |

The default suite has 44 tests: the original 28 regression checks plus sixteen fixture/runtime tests for the funded harness. The fixture/runtime tests do not add mainnet checklist coverage. `RR-<section>-<item>` IDs refer to the checklist snapshot investigated on 2026-09-23; an ID in a title indicates related coverage, not completion of every clause or variant:

| Checklist items                                 | Implemented scope                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2. Navigation: RR-02-01/03/04/05/07/08/11/12/13 | Route content and a sidebar/back journey; does not certify all charts, pool rows, metrics, or links                               |
| RR-02-17, RR-19-01/06, RR-22-24                 | Theme on Trade, sidebar settings/TWAP parts, referral code storage and URL cleanup                                                |
| RR-05-11, RR-06-01                              | Short tab and Limit/Market input visibility; no order submission                                                                  |
| RR-03-05/06/12/13                               | Mock-provider address/network, reconnect and disconnect; no real MetaMask extension certification                                 |
| RR-00-02/03/04                                  | Production **subsquid** configuration/availability only; other services, freshness and deployment compatibility remain unverified |

The browser fixture fails on unhandled JavaScript exceptions and attaches failed-request diagnostics. It does not certify a clean console or complete API availability. Mock-wallet tests reject every signature/transaction request. HTTP account reads use a fresh random address that has no known inventory. Contract events are deliberately empty; event delivery/recovery needs separate coverage. These are hybrid tests, not fully offline fixtures.

Existing component tests remain under `yarn test:ct`; they provide richer mocked trading states. The legacy `autotests` package remains independent and is not invoked by this workflow.

## Local commands

Use Node 22 and the root Yarn installation:

```sh
yarn install --immutable --mode=skip-build
yarn exec playwright install chromium
yarn test:regression:types
yarn test:regression
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev yarn test:regression
REGRESSION_CHAIN_ID=43114 yarn test:regression
yarn test:regression --project=connected-state
yarn test:regression:report
```

Playwright opens `https://test.gmx-interface.pages.dev` by default. Override `REGRESSION_BASE_URL` to test another already-running deployment, including a local URL. The regression runner and workflow do not build the application or start a server. Dependency installation uses `--mode=skip-build` to avoid the repository's SDK build/prepare hooks; these browser tests do not import the SDK build.

The report records the target URL and the test suite checkout separately. Local URL overrides do not verify the deployed SHA. Indexer checks read `src/config/indexers.ts` from the local checkout by default; `REGRESSION_INDEXER_CONFIG` can point to another candidate's file. They probe those URLs but do not inspect which endpoints the deployed app actually uses.

Every new project and the component suite allow **2 retries (3 attempts total)**. Retry passes remain visible as flaky. Browser workers are capped at 3; the preflight uses 1. Use `--retries=0` while debugging. Do not run heavy checks concurrently across local workspaces.

## GitHub Actions

`release-regression.yml` runs only on an explicit request: adding the **`run-regression`** PR label or using **Run workflow**. Ordinary pushes, PR creation, completed deployments and schedules do not start the regression tests. Other labels skip the jobs and do not cancel a requested regression run. Existing component/unit-test workflows are independent.

### Run from a PR, including before this workflow is merged

1. Push the workflow and test suite to the PR branch.
2. Add the **`run-regression`** label to the PR.
3. The workflow waits for the Cloudflare application preview for the commit at the time the label was added, then tests Arbitrum and Avalanche sequentially.
4. Read the results in the PR's Checks tab and the workflow's artifacts/summary.

The label trigger uses `pull_request: types: [labeled]`, so it can execute the workflow from this PR before the file exists on the default branch. Leaving the label attached does not enable runs on later pushes. Remove and re-add it to request a run for a new commit. **Re-run jobs** can retry the same event/commit; an old label event is rejected if the PR head has changed. Label runs never enable the optional funded preflight or receive its RPC secrets.

### Run from Actions after the workflow reaches the default branch

1. Open **Actions → Release regression → Run workflow**.
2. Select the test suite branch, enter the **PR number**, and select Arbitrum (`42161`) or Avalanche (`43114`). Optionally enable the read-only funded preflight.
3. Run the workflow. Repeat with the other chain when both are required.

GitHub requires this workflow to exist on the default branch (`release`) for `workflow_dispatch`. The label trigger provides the way to verify it before merge.

The resolver checks the selected commit's latest Cloudflare application check every 15 seconds for approximately 15 minutes. It accepts only a successful check from the Cloudflare app for that exact commit and extracts the immutable preview URL (for example `https://6425cbf1.gmx-interface.pages.dev`). It ignores the home project and branch aliases. A failed deployment, timeout, unexpected URL format, closed PR or changed head fails the job before browsers start. There is no fallback to the shared test deployment or a repository URL variable.

The test suite comes from the workflow revision (the PR merge revision for label events, or the selected ref for dispatch). The workflow reads the candidate's indexer configuration from a separate sparse checkout pinned to the resolved PR head SHA. It does not execute install/build scripts from that candidate checkout. The browser target is the already-built preview. A later push requires another explicit request; an existing browser run remains pinned to the originally resolved deployment.

The resolver uses the automatic `GITHUB_TOKEN` with read-only contents, pull-request and check permissions. No Cloudflare API token or wallet secrets are needed for the default jobs. Preview access must be available to GitHub-hosted runners.

Each job uploads HTML/JSON reports, failure screenshots, videos and traces for 14 days. The step summary distinguishes passed, flaky, failed and skipped tests. Missing reports, skipped prerequisites and failures prevent a green result; a skipped hard gate is not release evidence. Reports identify the PR, deployment SHA, Cloudflare check, preview URL, test suite revision and chain. The SHA association comes from Cloudflare's check, not an independent inspection of deployed assets. These reports cover the selected tests only, not the whole checklist.

Validate preview selection without starting browsers:

```sh
node --test --test-concurrency=3 autotests/regression/ci/resolvePreview.test.cjs
```

## Funded preparation and remaining work

The optional manual `funded_preflight` input uses the `regression_e2e` environment:

| Configuration                                                           | Kind                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------- |
| `REGRESSION_ARBITRUM_RPC_URL`, `REGRESSION_AVALANCHE_RPC_URL`           | Secrets                                         |
| `REGRESSION_ARBITRUM_MAX_GAS_GWEI`, `REGRESSION_AVALANCHE_MAX_GAS_GWEI` | Variables; explicit positive per-chain ceilings |

There are no default gas thresholds. Missing/invalid configuration, an RPC error, a different chain, stale block data, or gas above the ceiling produces `BLOCKED` with evidence. Blocked checks skip immediately without retrying past the gate; the summary command exits nonzero. RPC credential URLs are omitted from the evidence.

Local read-only preflight:

```sh
REGRESSION_CHAIN_ID=42161 \
REGRESSION_RPC_URL="$TEST_RPC_URL" \
REGRESSION_MAX_GAS_GWEI="$TEST_MAX_GAS_GWEI" \
yarn test:regression:funded-preflight
```

The default workflow does not receive a signing key or run paid transactions. It validates the separate economy harness with offline tests. See the [funded runner](funded/README.md) for the implemented small-wallet limits, durable journal, explicit local execution and final cleanup. The standalone gas preflight alone does not authorize transactions. Future funded scenarios must preserve:

- A gas check immediately before **every** paid action on every participating chain, including approvals, relays, retries and cleanup. The preflight result alone cannot authorize later spending.
- Per-action complete-fee and per-run budgets, including execution/relay/bridge/data fees and a cleanup reserve. Native gas price alone does not bound GMX costs.
- A durable action/fee journal outside retry output directories and worker memory. Reconcile nonce, tx/request/order IDs before retrying; never resend an ambiguous action. Preserve paid fees and reservations across attempts.
- A wallet lock shared with any SDK workflows using the same account, scoped cleanup, and unresolved-exposure reporting. High gas also blocks cleanup and subsequent funded use until reconciled.
- UI-driven transactions with independent checks of successful settlement and actual position/token balances. A tx hash or mock receipt is insufficient.

Still uncovered: funded trading/bridges/GM/GLV/staking/claims/1CT, populated account/position/order fixtures, controlled failures and price triggers, real wallet compatibility, mobile app switching, Firefox/Brave, MegaETH UI, deployment provenance/config drift across QA and shipping, qualitative UX/performance, release-specific fixes, and next-day announcements. Real-chain settlement and real device behavior cannot be certified with these mocks.
