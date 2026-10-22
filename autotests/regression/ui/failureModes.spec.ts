import { expect, type BrowserContext, type Request } from "@playwright/test";

import { test } from "../fixtures/browser";

const DATA_HOSTS = /(^|\.)(gmxapi\.io|gmxinfra2?\.io|squids\.live)$/;

function isRpc(request: Request) {
  return request.method() === "POST" && /"jsonrpc"/.test(request.postData() ?? "");
}

async function failRequests(context: BrowserContext, matches: (request: Request) => boolean, fail: "503" | "timeout") {
  const failed: string[] = [];
  await context.route("**/*", async (route) => {
    if (!matches(route.request())) return route.fallback();
    failed.push(new URL(route.request().url()).host);
    if (fail === "timeout") return route.abort("timedout");
    await route.fulfill({ status: 503, contentType: "text/plain", body: "Service Unavailable" });
  });
  return failed;
}

test("26.03 partial: with every JSON-RPC endpoint returning 503, /trade still shows API market data and does not crash", async ({
  page,
  context,
}) => {
  const failed = await failRequests(context, isRpc, "503");
  await page.goto("/trade", { waitUntil: "domcontentloaded" });
  const market = page.getByRole("banner").getByRole("button", { name: /\/USD/ });
  await expect(market).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("banner")).toContainText(/\$\s?[\d,]+\.\d+/, { timeout: 30_000 });
  await expect(page.getByTestId("tradebox")).toBeVisible();
  await expect.poll(() => new Set(failed).size, { message: "public RPC fallbacks were tried" }).toBeGreaterThan(1);
  await page.getByRole("link", { name: "Pools", exact: true }).first().click();
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
});

test("26.03 partial: when RPC, API, oracle keeper and indexer requests all time out, the shell stays usable and data recovers without a reload", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const failed = await failRequests(
    context,
    (request) => isRpc(request) || DATA_HOSTS.test(new URL(request.url()).hostname),
    "timeout"
  );
  await page.goto("/trade", { waitUntil: "domcontentloaded" });
  const header = page.getByRole("banner");
  await expect(page.getByTestId("tradebox")).toBeVisible();
  await expect.poll(() => failed.filter((host) => DATA_HOSTS.test(host)).length).toBeGreaterThan(10);
  // No price is invented while every source is down.
  await expect(header).toContainText(/24h volume/i);
  await expect(header).not.toContainText(/\$\s?[\d,]+\.\d+/);
  await expect(page.getByRole("link", { name: "Pools", exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(100);

  await context.unrouteAll({ behavior: "wait" });
  const restoredAt = Date.now();
  // Retry backoff grows with the outage; a 30s outage took about 30s to recover locally.
  await expect(header).toContainText(/\$\s?[\d,]+\.\d+/, { timeout: 120_000 });
  await expect(header.getByRole("button", { name: /\/USD/ })).toBeVisible();
  await test.info().attach("recovery", { body: `${Date.now() - restoredAt} ms after the network returned` });
});
