import { installFetchResponder } from "./fetchAdapter";
import { createRecordedResponder } from "./recordedResponder";

/**
 * Per-suite glue over {@link createRecordedResponder}: binds a fixtures directory and gives the
 * suite `install`/`finish` for `beforeAll`/`afterAll`. `finish` restores `fetch`, saves recorded
 * misses, and fails the replay run when fixtures were missing.
 */
export function createRecordedRpcSuite(options: { fixturesDir: string; httpHosts?: string[] }) {
  const responder = createRecordedResponder({
    fixturesDir: options.fixturesDir,
    httpHosts: options.httpHosts ?? [],
    realFetch: globalThis.fetch,
  });

  let restoreFetch: (() => void) | undefined;

  return {
    install() {
      restoreFetch = installFetchResponder(responder, { http: responder.http }).restore;
    },
    finish() {
      restoreFetch?.();
      restoreFetch = undefined;
      responder.save();

      if (responder.missingFixtures.length > 0) {
        throw new Error(
          "[recordedRpc] fixtures are missing; re-record with RECORD_RPC_FIXTURES=1:\n" +
            responder.missingFixtures.join("\n")
        );
      }
    },
  };
}
