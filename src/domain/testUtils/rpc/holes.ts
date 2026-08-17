import { MockChain, MockGelatoRelay } from "./mockChain";
import { RpcResponder } from "./types";

/** One installed adapter's contribution to {@link collectRpcHoles}. */
export type RpcHoleSource = {
  responder: RpcResponder;
  gelatoRelay?: MockGelatoRelay;
  /**
   * Hosts that talked JSON-RPC but are missing from `RPC_HOSTS_BY_CHAIN_ID`, so their chain could
   * not be recovered from the url. They are answered with a JSON-RPC error naming the host.
   */
  unknownRpcHosts?: string[];
  /** Gelato relay methods called while no `MockGelatoRelay` was installed. */
  relayCallsWithoutMock?: string[];
};

const installedSources: RpcHoleSource[] = [];

/** Both adapters register here on install, so hole collection works the same in CT and vitest. */
export function registerRpcHoleSource(source: RpcHoleSource) {
  installedSources.push(source);
}

/**
 * Drains and describes every JSON-RPC hole recorded since the last call by the responders the
 * adapters installed — unmapped hosts, relay calls with no `MockGelatoRelay`, and (for
 * {@link MockChain} / {@link MockGelatoRelay}) methods and `eth_call` selectors no branch answers.
 * A hole otherwise only surfaces as an opaque locator timeout, so every spec should wire
 * `test.afterEach(assertNoRpcHoles)`.
 *
 * Aborted non-RPC requests are deliberately not holes — the app tolerates losing them and the
 * specs would otherwise have to mock every incidental REST endpoint. They stay inspectable on
 * `RpcResponderHandle.unhandledRequests`.
 */
export function collectRpcHoles(): string[] {
  const holes: string[] = [];

  for (const { responder, gelatoRelay, unknownRpcHosts = [], relayCallsWithoutMock = [] } of installedSources.splice(
    0
  )) {
    for (const host of unknownRpcHosts) {
      holes.push(`JSON-RPC host missing from RPC_HOSTS_BY_CHAIN_ID: ${host}`);
    }
    for (const method of relayCallsWithoutMock) {
      holes.push(`Gelato relay call but no MockGelatoRelay installed (pass options.gelatoRelay): ${method}`);
    }
    if (responder instanceof MockChain) {
      for (const method of responder.unknownMethods) {
        holes.push(`RPC method no MockChain branch answers: ${method}`);
      }
      for (const selector of responder.unknownCallSelectors) {
        holes.push(`eth_call selector no MockChain branch answers: ${selector}`);
      }
    }
    if (gelatoRelay) {
      for (const method of gelatoRelay.unknownMethods) {
        holes.push(`relay method no MockGelatoRelay branch answers: ${method}`);
      }
    }
  }

  return holes;
}

/** `test.afterEach(assertNoRpcHoles)` — fails the test by hole name instead of by opaque timeout. */
export function assertNoRpcHoles() {
  const holes = collectRpcHoles();

  if (holes.length > 0) {
    throw new Error(`unanswered JSON-RPC requests:\n${holes.map((hole) => `  - ${hole}`).join("\n")}`);
  }
}
