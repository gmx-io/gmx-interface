# Test RPC mocking

One seam, two adapters, two responders.

```
vitest ──── fetchAdapter ─────┐                      ┌──── MockChain          (synthetic)
                              ├── RpcResponder ──────┤
playwright ─ playwrightAdapter┘                      └──── RecordedResponder  (recorded)
```

- **`types.ts`** — `RpcResponder.handle(chainId, { method, params })`. Everything else plugs into this.
- **Adapters** decide _how_ requests are intercepted. The runtime dictates the choice; there is
  nothing to pick.
  - `playwrightAdapter.ts` (`installRpcResponder`) — `page.route` in component tests.
  - `fetchAdapter.ts` (`installFetchResponder`) — a `fetch` stub in vitest.
  - Both recover the chain from the request url via `chainIdFromRpcUrl.ts`, so the app's real viem
    transports and multi-chain flows work unchanged.
- **Responders** decide _where the answer comes from_. This is the real choice:
  - `mockChain.ts` (`MockChain`) — a stateful, synthetic chain. The test declares the state it wants
    (`setTokenBalance`, `onchain.active`, `rejectTypedDataSign`, …) and every answer is derived from
    it. Use it when the question is _"does the UI react to state X"_, and when the test needs to
    force states that are hard or impossible to find on a real chain.
  - `recordedResponder.ts` (`RecordedResponder`) — replays responses captured from the real chains.
    It has no model of the chain and can only answer what was recorded. Use it when the question is
    _"does our decoding/derivation match what the chain actually returns"_ — which is what the
    multichain tracker tests assert.

## Unhandled requests are loud

A hole in a mock reads as "the field never rendered", not as a failure. So:

- the fetch adapter throws on any request neither responder claims;
- the Playwright adapter aborts unclaimed requests (kept in `handle.unhandledRequests` for
  debugging — mostly REST calls the app tolerates losing), and answers JSON-RPC hosts missing from
  `RPC_HOSTS_BY_CHAIN_ID` with an error naming the host (`handle.unknownRpcHosts`);
- `MockChain` collects `unknownMethods` and `unknownCallSelectors`, `MockGelatoRelay` collects its
  `unknownMethods`, and relay calls made with no `MockGelatoRelay` installed are tracked too — all
  for the same reason. Every spec drains the JSON-RPC holes with
  `test.afterEach(assertNoRpcHoles)` (`holes.ts`, re-exported from the Playwright adapter), so a
  hole fails the test by name instead of by timeout;
- `RecordedResponder` throws on fixture misses in replay mode and lists them in `missingFixtures` —
  assert it stays empty in `afterAll`, because transports retry the per-request errors away into
  opaque timeouts (see `finishRecordedRpc` in `domain/multichain/progress/__tests__/recordedRpc.ts`).

## Recording fixtures

`RecordedResponder` writes misses back to its `fixturesDir` when `RECORD_RPC_FIXTURES=1`:

```sh
RECORD_RPC_FIXTURES=1 yarn vitest run src/domain/multichain/progress/__tests__/tracker.spec.ts
```

Recording talks to the real network, so capture `globalThis.fetch` before the adapter stubs it and
pass it as `realFetch` (see `domain/multichain/progress/__tests__/recordedRpc.ts`). RPC misses are
recorded via the configured providers in order (express first — loosest `getLogs` limits — some
public endpoints are dead without an api key); replies that carry an error — non-2xx, JSON-RPC
`error`, a body with neither result nor error, and for REST 401/403/429/5xx (a semantic 404 is
recorded) — abort the recording instead of becoming plausible-looking `null` fixtures.

Only record settled transactions: a response captured mid-flight (e.g. an in-progress LayerZero
status that the app polls until it changes) replays that intermediate state forever.
