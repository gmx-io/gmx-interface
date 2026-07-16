import arbitrumMarkets from "test/fixtures/arbitrumMarkets.json";
import arbitrumTickers from "test/fixtures/arbitrumTickers.json";
import arbitrumTokens from "test/fixtures/arbitrumTokens.json";

const keeperResponsesByPathname: Record<string, unknown> = {
  "/markets": arbitrumMarkets,
  "/tokens": arbitrumTokens,
  "/prices/tickers": arbitrumTickers,
};

// Replaces "cross-fetch" in the multicall test run (aliased in vitest.multicall.config.ts) to serve
// recorded oracle keeper responses instead of flaky live gmxinfra calls (FEDEV-4029). Re-record with
// e.g. `curl https://arbitrum-api.gmxinfra.io/markets -o src/test/fixtures/arbitrumMarkets.json`.
const fetchWithKeeperFixtures: typeof fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

  if (!url.hostname.endsWith("gmxinfra.io") && !url.hostname.endsWith("gmxinfra2.io")) {
    return fetch(input, init);
  }

  const fixture = keeperResponsesByPathname[url.pathname];

  if (!fixture) {
    return Promise.reject(new Error(`No recorded keeper fixture for ${url.pathname}, add it to src/test/fixtures`));
  }

  return Promise.resolve(new Response(JSON.stringify(fixture), { headers: { "Content-Type": "application/json" } }));
};

export default fetchWithKeeperFixtures;
