import { MockChain } from "./mockChain";
import { RpcResponder } from "./types";

export type RpcHoleSource = {
  responder: RpcResponder;
  /** JSON-RPC hosts missing from `RPC_HOSTS_BY_CHAIN_ID`, so their chain could not be recovered. */
  unknownRpcHosts?: string[];
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

  for (const { responder, unknownRpcHosts = [] } of installedSources.splice(
    0
  )) {
    for (const host of unknownRpcHosts) {
      holes.push(`JSON-RPC host missing from RPC_HOSTS_BY_CHAIN_ID: ${host}`);
    }
    if (responder instanceof MockChain) {
      for (const method of responder.unknownMethods) {
        holes.push(`RPC method no MockChain branch answers: ${method}`);
      }
      for (const selector of responder.unknownCallSelectors) {
        holes.push(`eth_call selector no MockChain branch answers: ${selector}`);
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
