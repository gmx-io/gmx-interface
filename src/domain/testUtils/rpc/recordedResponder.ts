/* eslint-disable no-console */
import fs from "fs";
import path from "path";

import { getRpcProviders } from "config/rpc";
import { AnyChainId } from "sdk/configs/chains";

import { HttpRequestInfo, HttpResponder, MockHttpResponse, RpcRequest, RpcResponder } from "./types";

// eslint-disable-next-line no-restricted-globals -- test-only helper, never bundled into the client
export const IS_RECORDING = process.env.RECORD_RPC_FIXTURES === "1";

type RpcFixtures = Record<string, unknown>;
type HttpFixture = { status: number; body: unknown };
type HttpFixtures = Record<string, HttpFixture>;

export type RecordedResponderOptions = {
  /** Directory holding `rpc-<chainId>.json` and `http.json`. */
  fixturesDir: string;
  /** Hosts served from `http.json`; everything else is left to the caller (and throws by default). */
  httpHosts: string[];
  /**
   * Used for recording misses. Capture it *before* the fetch adapter stubs the global, otherwise
   * recording would recurse back into this responder.
   */
  realFetch?: typeof globalThis.fetch;
};

export type RecordedResponder = RpcResponder & {
  /** Pass as the `http` option of the fetch adapter. */
  http: HttpResponder;
  /** Writes recorded misses back to `fixturesDir`. No-op unless `RECORD_RPC_FIXTURES=1`. */
  save: () => void;
  /**
   * Fixture keys requested but absent during replay. Each miss also throws from `handle`/`http`,
   * but transports retry those errors away into opaque timeouts — assert this stays empty in
   * `afterAll` so a drifted fixture fails with the missing keys instead.
   */
  missingFixtures: string[];
};

/**
 * Replays JSON-RPC and REST responses recorded from the real chains, so tests that assert on
 * production data stay deterministic and offline.
 *
 * Unlike {@link MockChain} this responder holds no model of the chain — it can only answer requests
 * that were seen while recording. Use it when the point of the test is "does our decoding match what
 * the chain actually returns"; use `MockChain` when the point is "does the UI react to state X".
 *
 * Re-record by setting `RECORD_RPC_FIXTURES=1`: misses then go to the real endpoints and are written
 * back into the fixture directory on `save`. Only record settled transactions — a response captured
 * mid-flight (e.g. an in-progress LayerZero status) replays that intermediate state forever.
 */
export function createRecordedResponder(options: RecordedResponderOptions): RecordedResponder {
  const rpcFixturesByChainId = new Map<number, RpcFixtures>();
  let httpFixtures: HttpFixtures | undefined;
  const missingFixtures: string[] = [];

  function getRealFetch(): typeof globalThis.fetch {
    if (!options.realFetch) {
      throw new Error("[recordedResponder] recording requires `realFetch` captured before the adapter is installed");
    }

    return options.realFetch;
  }

  function getRpcFixturesPath(chainId: number) {
    return path.join(options.fixturesDir, `rpc-${chainId}.json`);
  }

  function getHttpFixturesPath() {
    return path.join(options.fixturesDir, "http.json");
  }

  function getRpcFixtures(chainId: number): RpcFixtures {
    let fixtures = rpcFixturesByChainId.get(chainId);

    if (!fixtures) {
      fixtures = readJsonFile<RpcFixtures>(getRpcFixturesPath(chainId), {});
      rpcFixturesByChainId.set(chainId, fixtures);
    }

    return fixtures;
  }

  function getHttpFixtures(): HttpFixtures {
    if (!httpFixtures) {
      httpFixtures = readJsonFile<HttpFixtures>(getHttpFixturesPath(), {});
    }

    return httpFixtures;
  }

  async function recordRpc(chainId: number, request: RpcRequest): Promise<unknown> {
    // Express endpoints fall back to the default ones and have the loosest getLogs limits.
    const provider =
      getRpcProviders(chainId as AnyChainId, "express")[0] ?? getRpcProviders(chainId as AnyChainId, "default")[0];

    if (!provider) {
      throw new Error(`[recordedResponder] no RPC endpoint configured for chain ${chainId}`);
    }

    const response = await getRealFetch()(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: request.method, params: request.params ?? [] }),
    });

    // A failed request (bad key, rate limit) must abort the recording, not become a `null` fixture.
    if (!response.ok) {
      throw new Error(
        `[recordedResponder] ${request.method} failed while recording: HTTP ${response.status} ${await response.text()}`
      );
    }

    const payload = (await response.json()) as { result?: unknown; error?: { message: string } };

    if (payload.error) {
      throw new Error(`[recordedResponder] ${request.method} failed while recording: ${payload.error.message}`);
    }
    if (!("result" in payload)) {
      throw new Error(
        `[recordedResponder] ${request.method} returned neither result nor error while recording: ${JSON.stringify(payload)}`
      );
    }

    // `undefined` would not survive JSON serialization of the fixture file.
    return payload.result ?? null;
  }

  async function handle(chainId: number, request: RpcRequest): Promise<unknown> {
    const fixtures = getRpcFixtures(chainId);
    const key = getRpcFixtureKey(request);

    if (key in fixtures) {
      return fixtures[key];
    }

    if (!IS_RECORDING) {
      missingFixtures.push(`chain ${chainId}: ${key}`);
      throw new Error(`[recordedResponder] missing RPC fixture for chain ${chainId}: ${key}`);
    }

    const result = await recordRpc(chainId, request);
    fixtures[key] = result;
    return result;
  }

  async function http(url: URL, request: HttpRequestInfo): Promise<MockHttpResponse | undefined> {
    if (!options.httpHosts.some((host) => url.host.includes(host))) {
      return undefined;
    }

    const fixtures = getHttpFixtures();
    const key = getHttpFixtureKey(url, request);
    let fixture = fixtures[key];

    if (!fixture) {
      if (!IS_RECORDING) {
        missingFixtures.push(key);
        throw new Error(`[recordedResponder] missing HTTP fixture for ${key}`);
      }

      const response = await getRealFetch()(url.toString(), { method: request.method, body: request.body });

      // Semantic statuses (e.g. LayerZero scan 404 for an unindexed tx) are part of the recorded
      // behavior, but auth failures and transient errors must not become permanent fixtures.
      if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
        throw new Error(`[recordedResponder] ${key} failed while recording: HTTP ${response.status}`);
      }

      const text = await response.text();
      fixture = { status: response.status, body: text ? JSON.parse(text) : null };
      fixtures[key] = fixture;
    }

    return { status: fixture.status, body: fixture.body === null ? "" : JSON.stringify(fixture.body) };
  }

  function save() {
    if (!IS_RECORDING) {
      return;
    }

    for (const [chainId, fixtures] of rpcFixturesByChainId) {
      writeFixtureFile(getRpcFixturesPath(chainId), fixtures);
      console.log(`[recordedResponder] saved ${Object.keys(fixtures).length} entries for chain ${chainId}`);
    }

    if (httpFixtures) {
      writeFixtureFile(getHttpFixturesPath(), httpFixtures);
      console.log(`[recordedResponder] saved ${Object.keys(httpFixtures).length} http entries`);
    }
  }

  return { handle, http, save, missingFixtures };
}

function getRpcFixtureKey({ method, params }: RpcRequest) {
  return `${method}|${JSON.stringify(params ?? [])}`;
}

/** Method and body are part of the key so e.g. two GraphQL POSTs to one endpoint don't collide. */
function getHttpFixtureKey(url: URL, request: HttpRequestInfo) {
  return `${request.method} ${url.toString()}${request.body ? `|${request.body}` : ""}`;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

/** One entry per line, sorted by key — keeps the (large) fixture files diffable. */
function writeFixtureFile(filePath: string, fixtures: Record<string, unknown>) {
  const lines = Object.keys(fixtures)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(fixtures[key]) ?? "null"}`);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `{\n${lines.join(",\n")}\n}\n`);
}
