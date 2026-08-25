import { MockChain, MockGelatoRelay } from "./mockChain";
import { RpcResponder } from "./types";

export type RpcHoleSource = {
  responder: RpcResponder;
  gelatoRelay?: MockGelatoRelay;
  /** JSON-RPC hosts missing from `RPC_HOSTS_BY_CHAIN_ID`, so their chain could not be recovered. */
  unknownRpcHosts?: string[];
  /** Gelato relay methods called while no `MockGelatoRelay` was installed. */
  relayCallsWithoutMock?: string[];
};

const installedSources: RpcHoleSource[] = [];

export function registerRpcHoleSource(source: RpcHoleSource) {
  installedSources.push(source);
}

/**
 * Drains every JSON-RPC hole recorded since the last call. A hole otherwise only surfaces as an
 * opaque locator timeout; aborted non-RPC requests are deliberately not holes — the app tolerates
 * losing them (see `RpcResponderHandle.unhandledRequests`).
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

export function assertNoRpcHoles() {
  const holes = collectRpcHoles();

  if (holes.length > 0) {
    throw new Error(`unanswered JSON-RPC requests:\n${holes.map((hole) => `  - ${hole}`).join("\n")}`);
  }
}
