import { HttpError } from "sdk/utils/http/http";
import type { IHttp } from "sdk/utils/http/types";

// Dev-only stand-in for the Solana host, answering from gmx-api's sample responses (FESOL-61).
// The samples are not a reviewed contract yet.
export const GMSOL_FIXTURE_HTTP_URL = "gmsol-fixtures://solana";

const TEST_WALLET_PLACEHOLDER = "<TEST_WALLET>";

type FixtureLoader = () => Promise<unknown>;

const FIXTURE_LOADERS: Record<string, FixtureLoader> = {
  "/v1/markets/config": () => import("./__fixtures__/marketsConfig.json").then((m) => m.default),
  "/v1/markets/values": () => import("./__fixtures__/marketsValues.json").then((m) => m.default),
  "/v1/positions": () => import("./__fixtures__/positions.json").then((m) => m.default),
  "/v1/orders": () => import("./__fixtures__/orders.json").then((m) => m.default),
  "/v1/fee-discount": () => import("./__fixtures__/feeDiscount.json").then((m) => m.default),
  "/v1/pairs": () => import("./__fixtures__/pairs.json").then((m) => m.default),
};

// The app marks markets stale when values lag by more than 10 s, so every response carries a fresh updatedAt.
const PATHS_WITH_UPDATED_AT = new Set(["/v1/markets/values", "/v1/fee-discount"]);

function replaceTestWallet(value: unknown, address: string): unknown {
  if (typeof value === "string") {
    return value.split(TEST_WALLET_PLACEHOLDER).join(address);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceTestWallet(item, address));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceTestWallet(item, address)]));
  }

  return value;
}

function stampUpdatedAt(value: unknown, updatedAt: number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => ({ ...item, updatedAt }));
  }

  return { ...(value as object), updatedAt };
}

export function createGmsolFixtureHttp({ now = Date.now }: { now?: () => number } = {}): IHttp {
  return {
    url: GMSOL_FIXTURE_HTTP_URL,

    async fetchJson<TResult>(
      path: string,
      opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
    ): Promise<TResult> {
      const loader = FIXTURE_LOADERS[path];

      if (!loader) {
        throw new HttpError(404, `HTTP 404: no gmsol fixture for ${path}`);
      }

      let json = structuredClone(await loader());

      const address = opts?.query?.address;
      if (typeof address === "string" && address) {
        json = replaceTestWallet(json, address);
      }

      if (PATHS_WITH_UPDATED_AT.has(path)) {
        json = stampUpdatedAt(json, now());
      }

      return opts?.transform ? opts.transform(json) : (json as TResult);
    },

    async postJson(path: string) {
      throw new HttpError(405, `HTTP 405: gmsol fixtures are read-only (${path})`);
    },
  };
}
