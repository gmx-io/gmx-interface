import { expect, test, type Page } from "@playwright/test";

import { checkOrder, checkPosition, checkTradeUiReady, connectFundedWallet } from "./browser";

const usd = 10n ** 30n;

for (const status of [404, 200]) {
  test(`funded UI: unavailable deployment (${status}) reports the target problem before wallet RPC`, async ({
    page,
    context,
  }) => {
    await page.route("**/*", (route) =>
      route.fulfill({
        status,
        contentType: "text/html",
        body: "<!doctype html><h1>Nothing is here yet</h1>",
      })
    );
    let walletReads = 0;
    const session: Parameters<typeof connectFundedWallet>[2] = {
      address: "0x1111111111111111111111111111111111111111",
      rpc: {
        request: async () => {
          walletReads++;
          throw new Error("Unexpected wallet read");
        },
      },
    };
    await expect(connectFundedWallet(page, context, session)).rejects.toThrow(
      status === 404 ? "Deployment returned status 404" : "Deployment is not available yet"
    );
    expect(walletReads).toBe(0);
  });
}

async function serveTradePage(
  page: Page,
  {
    direction = "Long",
    size = "2.00",
    empty = false,
    initialLoadMs = 0,
    reloadLoadMs = 0,
    walletLoadMs = 0,
    ordersEmpty = false,
  } = {}
) {
  let navigations = 0;
  await page.route("**/*", (route) => {
    const loadingMs = navigations++ === 0 ? initialLoadMs : reloadLoadMs;
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><body>
        <button data-qa="user-address" id="wallet" ${walletLoadMs ? "hidden" : ""}>0x1111...1111</button>
        <div data-qa="trade-table-large">
          <div data-qa="exchange-list-tabs">
            <button onclick="showPositions()">Positions<span>${empty ? "0" : "1"}</span></button>
            <button onclick="showOrders()">Orders</button>
          </div>
          <section id="positions">
            <table><thead><tr><th>POSITION</th><th>SIZE</th><th>MARGIN</th></tr></thead><tbody id="rows" ${loadingMs ? "hidden" : ""}>
              ${empty ? "" : `<tr><td>ETH ETH/USD 0.80x${direction}</td><td>$\u200a${size}</td><td>$\u200a2.00</td></tr>`}
            </tbody></table>
            <p id="loading" ${loadingMs ? "" : "hidden"}>Loading...</p>
            ${empty ? '<p id="empty" hidden>No open positions</p>' : ""}
          </section>
          <section id="orders" hidden><table><thead><tr><th>ORDER</th><th>SIZE</th><th>TRIGGER PRICE</th><th>MARK PRICE</th></tr></thead><tbody></tbody></table>${ordersEmpty ? "" : '<div data-qa="order-test-key">ETH limit</div>'}</section>
        </div>
        <script>
          setTimeout(() => { document.getElementById('wallet').hidden = false; document.body.dataset.walletReady = 'true'; }, ${walletLoadMs});
          function showPositions() { document.getElementById('positions').hidden = false; document.getElementById('orders').hidden = true; localStorage.setItem('tab', 'positions'); }
          function showOrders() { document.getElementById('positions').hidden = true; document.getElementById('orders').hidden = false; localStorage.setItem('tab', 'orders'); }
          if (localStorage.getItem('tab') === 'orders') showOrders();
          setTimeout(() => {
            document.getElementById('loading').hidden = true;
            document.getElementById('rows').hidden = false;
            const empty = document.getElementById('empty');
            if (empty) { empty.hidden = false; document.body.dataset.loaded = 'true'; }
          }, ${Math.max(300, loadingMs)});
        </script>
      </body></html>`,
    });
  });
}

for (const direction of ["Long", "Short"]) {
  test(`funded UI: ${direction} position and refresh work with counted tabs and formatted USD`, async ({ page }) => {
    await serveTradePage(page, { direction });
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations++;
    });
    await checkPosition(page, 2n * usd, direction === "Long");
    expect(navigations).toBe(2);
  });
}

for (const phase of ["initial", "reload"] as const) {
  test(`funded UI: ${phase} data loading can outlast the ordinary assertion timeout`, async ({ page }) => {
    await serveTradePage(page, {
      initialLoadMs: phase === "initial" ? 1_500 : 0,
      reloadLoadMs: phase === "reload" ? 1_500 : 0,
    });
    await checkPosition(page, 2n * usd);
    await expect(page.getByText("Loading...", { exact: true })).toBeHidden();
  });
}

test("funded UI: readiness waits for position data before the first paid action", async ({ page }) => {
  await serveTradePage(page, { empty: true, initialLoadMs: 1_500 });
  await page.goto("/trade");
  await checkTradeUiReady(page);
  await expect(page.getByText("Loading...", { exact: true })).toBeHidden({ timeout: 100 });
  await expect(page.getByText("No open positions", { exact: true })).toBeVisible();
});

test("funded UI: a loaded short position cannot satisfy a long assertion", async ({ page }) => {
  await serveTradePage(page, { direction: "Short", initialLoadMs: 1_500 });
  await expect(checkPosition(page, 2n * usd, true)).rejects.toThrow("toHaveCount");
  await expect(page.getByText("Loading...", { exact: true })).toBeHidden({ timeout: 100 });
});

test("funded UI: collateral cannot satisfy an incorrect size assertion", async ({ page }) => {
  await serveTradePage(page, { size: "3.00" });
  await expect(checkPosition(page, 2n * usd)).rejects.toThrow("toContainText");
});

test("funded UI: an empty table during loading does not prove the position is closed", async ({ page }) => {
  await serveTradePage(page, { empty: true });
  await checkPosition(page, 0n);
  await expect(page.locator("body")).toHaveAttribute("data-loaded", "true");
});

test("funded UI: readiness and order checks use the visible tab buttons", async ({ page }) => {
  await serveTradePage(page);
  await page.goto("/trade");
  await checkTradeUiReady(page);
  await checkOrder(page, "test-key");
});

test("funded UI: an empty position table cannot pass while the wallet is reconnecting", async ({ page }) => {
  await serveTradePage(page, { empty: true, walletLoadMs: 1_500 });
  await checkPosition(page, 0n);
  await expect(page.locator("body")).toHaveAttribute("data-wallet-ready", "true", { timeout: 100 });
});

test("funded UI: a missing order cannot pass cancellation while the wallet is reconnecting", async ({ page }) => {
  await serveTradePage(page, { ordersEmpty: true, walletLoadMs: 1_500 });
  await checkOrder(page, "test-key", false);
  await expect(page.locator("body")).toHaveAttribute("data-wallet-ready", "true", { timeout: 100 });
});
