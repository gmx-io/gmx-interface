# Release regression — PRO-4345

Initial Playwright coverage for the [release checklist](https://linear.app/gmx-io/document/release-regression-checklist-8b05a61482b0)
and [PRO-4345](https://linear.app/gmx-io/issue/PRO-4345/chore-automate-weekly-release-regression-testing).
This suite is a first slice, not a complete release sign-off.

## Reconnect finding from the initial local validation

The initial local production-build run reported **27 passed, 1 failed** on both Arbitrum and Avalanche. The failing check was RR-03-13 (reconnect after refresh): the injected provider remained connected, but the header stayed in wallet initialization instead of displaying the account within 15 seconds. Arbitrum also failed both configured retries. Earlier development-server runs passed. This is an observed failure with a mock provider, not a confirmed real-extension bug or an established root cause. Suspected wallet-restoration and mock-compatibility issues require further investigation. The test remains a regular assertion.

Run the reconnect check against a deployment:

```sh
REGRESSION_BASE_URL=https://test.gmx-interface.pages.dev \
yarn test:regression --project=connected-state --grep=RR-03-13 --retries=0
```

Use the HTML report to inspect the screenshot, trace and `mock-wallet-state` attachment. Results from the initial local build do not establish the behavior of another deployment. GitHub execution still requires pushing the workflow.

The first URL-based attempt against `https://test.gmx-interface.pages.dev` timed out while opening `/trade`, before wallet interaction. A separate HTTPS connection check also timed out on port 443 from the local test environment. Reconnect behavior on this deployment is therefore not yet verified.

## Suites and current coverage

| Project                              | Coverage                                                                                                                                                                         | Wallet/data                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ui`                                 | Eight public routes, sidebar/back navigation, legacy hash routing, 404 recovery, theme persistence, TWAP settings persistence, referral links, Short/Limit/Market form switching | No wallet; live public HTTP services                                                                   |
| `connected-state`                    | Privy connection, displayed address/network, reconnect after refresh, disconnect, empty positions/orders, insufficient-balance submission prevention                             | Fresh mock EIP-1193 account; zero wallet balance; empty mocked WebSocket event stream; live HTTP reads |
| `gates`                              | Production subsquid URL tags and GraphQL availability on Arbitrum/Avalanche/MegaETH; negative tests for the gas guard                                                            | No wallet; live indexers, simulated RPC responses for gas-guard tests                                  |
| `funded-preflight` (separate config) | Live RPC network/freshness and configured gas ceiling                                                                                                                            | Read-only; no signer, private key, or transactions                                                     |

The initial default suite has 28 tests. `RR-<section>-<item>` IDs refer to the checklist snapshot investigated on 2026-09-23; an ID in a title indicates related coverage, not completion of every clause or variant:

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

`release-regression.yml` is **manual only** (`workflow_dispatch`). PR updates, pushes, completed deployments and schedules do not start this regression workflow. Existing component/unit-test workflows are independent.

1. Wait for the target PR's **Cloudflare Pages: gmx-interface** check to succeed.
2. Open **Actions → Release regression → Run workflow**.
3. Select a branch containing the regression test suite, enter the **PR number**, and select Arbitrum (`42161`) or Avalanche (`43114`). Optionally enable the read-only funded preflight.
4. Run the workflow. Repeat with the other chain when both are required.

GitHub requires this workflow to exist on the repository's default branch before offering manual dispatch. This local change must be pushed and integrated there before that UI is available.

The resolver reads the open PR's current head SHA and its latest Cloudflare application check. It accepts only a successful check from the Cloudflare app for that exact commit and extracts the immutable preview URL (for example `https://6425cbf1.gmx-interface.pages.dev`). It ignores the home project and branch aliases. A missing/pending/failed deployment, unexpected URL format, or PR change during resolution fails the job before browsers start. There is no fallback to the shared test deployment or repository URL variable. Deploy the current commit and manually rerun if resolution fails.

The test suite comes from the selected workflow revision, so it can also test PRs that do not contain the harness. The workflow reads the candidate's indexer configuration from a separate sparse checkout pinned to the resolved PR SHA. It does not execute candidate install/build scripts. The browser target is the already-built preview. A later push requires another manual run; an existing run remains pinned to the original resolved deployment.

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

**Funded browser journeys are not enabled yet.** This gas preflight is a reusable prerequisite, not a safe transaction runner. Before enabling real transactions, implement:

- A gas check immediately before **every** paid action on every participating chain, including approvals, relays, retries and cleanup. The preflight result alone cannot authorize later spending.
- Per-action complete-fee and per-run budgets, including execution/relay/bridge/data fees and a cleanup reserve. Native gas price alone does not bound GMX costs.
- A durable action/fee journal outside retry output directories and worker memory. Reconcile nonce, tx/request/order IDs before retrying; never resend an ambiguous action. Preserve paid fees and reservations across attempts.
- A wallet lock shared with any SDK workflows using the same account, scoped cleanup, and unresolved-exposure reporting. High gas also blocks cleanup and subsequent funded use until reconciled.
- UI-driven transactions with independent checks of successful settlement and actual position/token balances. A tx hash or mock receipt is insufficient.

Still uncovered: funded trading/bridges/GM/GLV/staking/claims/1CT, populated account/position/order fixtures, controlled failures and price triggers, real wallet compatibility, mobile app switching, Firefox/Brave, MegaETH UI, deployment provenance/config drift across QA and shipping, qualitative UX/performance, release-specific fixes, and next-day announcements. Real-chain settlement and real device behavior cannot be certified with these mocks.
