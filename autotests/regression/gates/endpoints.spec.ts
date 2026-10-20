import { expect, test } from "@playwright/test";

import { productionChains, readProductionEndpoints } from "../fixtures/productionChains";

const NON_PRODUCTION_TOKENS = new Set([
  "test",
  "testnet",
  "staging",
  "stage",
  "dev",
  "preview",
  "sandbox",
  "sepolia",
  "fuji",
  "localhost",
]);
const NON_PRODUCTION_HOSTS = /(\.ondigitalocean\.app|\.pages\.dev|\.vercel\.app|\.netlify\.app|ngrok|\.gmxapi\.ai)$/;
const MAX_PRICE_AGE_SECONDS = 5 * 60;

const endpoints = readProductionEndpoints();

test("0.02 shipping endpoints for production chains avoid test and staging hosts", async ({}, testInfo) => {
  const offenders = endpoints.filter(({ url }) => {
    const { hostname, pathname } = new URL(url);
    return (
      NON_PRODUCTION_HOSTS.test(hostname) ||
      /^\d+(\.\d+){3}$/.test(hostname) ||
      `${hostname} ${pathname}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .some((token) => NON_PRODUCTION_TOKENS.has(token))
    );
  });
  await testInfo.attach("production-endpoints", {
    body: JSON.stringify(endpoints, null, 2),
    contentType: "application/json",
  });
  expect(endpoints.length).toBeGreaterThan(10);
  expect(offenders).toEqual([]);
});

for (const { configKey } of productionChains) {
  test(`0.03 ${configKey} oracle keeper and its fallbacks serve fresh prices`, async ({ request }) => {
    const urls = endpoints
      .filter(({ file, keys }) => file === "sdk/src/configs/oracleKeeper.ts" && keys[1] === configKey)
      .map(({ url }) => url);
    expect(urls.length).toBeGreaterThan(1);
    for (const url of urls) {
      const response = await request.get(`${url}/prices/tickers`, { timeout: 20_000 });
      expect(response.status(), url).toBe(200);
      const tickers: { timestamp: number; minPrice: string }[] = await response.json();
      expect(tickers.length, url).toBeGreaterThan(0);
      const age = Date.now() / 1000 - Math.max(...tickers.map(({ timestamp }) => timestamp));
      expect(age, `${url} newest price age in seconds`).toBeLessThan(MAX_PRICE_AGE_SECONDS);
    }
  });

  test(`0.03 ${configKey} API serves enabled markets`, async ({ request }) => {
    const urls = endpoints
      .filter(({ file, keys }) => file === "sdk/src/configs/api.ts" && keys.includes(configKey))
      .map(({ url }) => url);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const response = await request.get(`${url}/v1/markets/info`, { timeout: 30_000 });
      expect(response.status(), url).toBe(200);
      const markets: { isDisabled: boolean }[] = await response.json();
      expect(markets.filter(({ isDisabled }) => !isDisabled).length, url).toBeGreaterThan(0);
    }
  });
}

test("0.03 stats backends answer volume, supply and position requests", async ({ request }) => {
  const urls = [...new Set(endpoints.filter(({ file }) => file === "src/config/backend.ts").map(({ url }) => url))];
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    for (const path of ["/total_volume", "/gmx_supply", "/position_stats"]) {
      const response = await request.get(`${url}${path}`, { timeout: 30_000 });
      expect(response.status(), `${url}${path}`).toBe(200);
      expect((await response.body()).length, `${url}${path}`).toBeGreaterThan(0);
    }
  }
});
