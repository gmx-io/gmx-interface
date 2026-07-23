import { test, expect } from "@playwright/experimental-ct-react";
import type { Locator, Page, Route } from "playwright-core";

import { getDataQALocator } from "lib/__tests__/testUtils";

import { TradeBoxStory } from "./TradeBox.ct.stories";

// Real Arbitrum addresses mirrored by the fixtures (mockTokens pulls them from sdk configs).
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const KYBER_ROUTER = "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5";

const KYBER_ROUTES_URL = "**/aggregator-api.kyberswap.com/arbitrum/api/v1/routes**";
const KYBER_BUILD_URL = "**/aggregator-api.kyberswap.com/arbitrum/api/v1/route/build**";

// 1000 USDC -> 0.5 ETH
const ROUTE_SUMMARY = {
  tokenIn: USDC_ADDRESS,
  amountIn: "1000000000",
  amountInUsd: "1000",
  tokenOut: WETH_ADDRESS,
  amountOut: "500000000000000000",
  amountOutUsd: "1000",
  gas: "500000",
  gasPrice: "10000000",
  gasUsd: "0.5",
  extraFee: { feeAmount: "0", chargeFeeBy: "", isInBps: false, feeReceiver: "" },
  route: [[]],
};

async function mockKyberSuccess(
  page: Page,
  { delayMs = 0, amountOut, amountOutUsd }: { delayMs?: number; amountOut?: string; amountOutUsd?: string } = {}
) {
  const summary = {
    ...ROUTE_SUMMARY,
    amountOut: amountOut ?? ROUTE_SUMMARY.amountOut,
    amountOutUsd: amountOutUsd ?? ROUTE_SUMMARY.amountOutUsd,
  };
  const counters = { routes: 0 };
  await page.route(KYBER_ROUTES_URL, async (route: Route) => {
    counters.routes++;
    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      json: { code: 0, message: "ok", data: { routeSummary: summary, routerAddress: KYBER_ROUTER } },
    });
  });
  await page.route(KYBER_BUILD_URL, (route: Route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "ok",
        data: {
          amountIn: summary.amountIn,
          amountInUsd: summary.amountInUsd,
          amountOut: summary.amountOut,
          amountOutUsd: summary.amountOutUsd,
          gas: summary.gas,
          gasUsd: summary.gasUsd,
          outputChange: { amount: "0", percent: 0, level: 0 },
          data: "0xdeadbeef",
          routerAddress: KYBER_ROUTER,
        },
      },
    })
  );
  return counters;
}

async function mockKyberNoRoute(page: Page) {
  await page.route(KYBER_ROUTES_URL, (route: Route) =>
    route.fulfill({ json: { code: 4008, message: "route not found", data: null } })
  );
}

type PageLike = {
  locator: (selector: string) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
};

test.beforeEach(async ({ page }) => {
  // Hermetic: fixtures provide all data, requests to real backends are dropped.
  // Kyber mocks are registered per-test after this and take precedence (later routes win).
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
});

async function openSwap(page: PageLike) {
  await page.locator(getDataQALocator("trade-direction-swap")).getByRole("button", { name: "Swap" }).click();
}

async function openExecutionDetails(page: PageLike) {
  await page.getByText("Execution details").click();
}

async function armLatch(page: PageLike) {
  await page.locator(getDataQALocator("test-external-swap-latch")).click();
}

test.describe("External swaps", () => {
  test("routes a swap through KyberSwap when GMX pools can't fill it", async ({ mount, page }) => {
    await mockKyberSuccess(page);
    await mount(<TradeBoxStory withExternalSwapHandler marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    // The quote (debounce + two-step Kyber request) lands in the store and drives the receive amount.
    const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
    await expect(receiveInput).toHaveValue("0.5", { timeout: 15_000 });

    // The route source lives in the collapsed "Execution details" section.
    await page.getByText("Execution details").click();
    await expect(page.getByText("Swap route")).toBeVisible();
    await expect(page.getByText("KyberSwap (external)")).toBeVisible();
  });

  test("shows the no-route banner with an aggregator escape when Kyber has nothing either", async ({
    mount,
    page,
  }) => {
    await mockKyberNoRoute(page);
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    await expect(
      page.getByText("GMX pools can't fill this swap, and no external route is currently available", { exact: false })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Swap on an external aggregator")).toBeVisible();

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity");
    await expect(submitButton).toBeDisabled();
  });

  test("TWAP swap can't use external routes: warns and switches back to market", async ({ mount, page }) => {
    await mockKyberSuccess(page);
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="drainedEthPool" />);

    await openSwap(page);
    // In swap mode TWAP is a direct trade-mode tab (no "More" dropdown).
    await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "TWAP", exact: true }).click();
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    await expect(
      page.getByText("TWAP swaps use GMX pool liquidity only", { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    // The disabled button explains the same block and offers the same escape in its tooltip.
    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity");
    await submitButton.hover({ force: true });
    await expect(page.getByText("Switch to a market order")).toBeVisible();

    await page.getByText("Switch to market order", { exact: true }).click();

    // Back on Market the external quote applies again and the warning goes away.
    await expect(page.getByText("TWAP swaps use GMX pool liquidity only")).not.toBeVisible();
    await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("0.5", { timeout: 15_000 });
  });

  test("keeps a healthy swap on GMX pools when the external quote is worse", async ({ mount, page }) => {
    // 1000 USDC -> 0.4 ETH ($800): clearly worse than the internal route.
    await mockKyberSuccess(page, { amountOut: "400000000000000000", amountOutUsd: "800" });
    await mount(<TradeBoxStory withExternalSwapHandler />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    // ~0.5 ETH minus internal swap fees and impact
    const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
    await expect(receiveInput).not.toHaveValue("");

    await openExecutionDetails(page);
    await expect(page.getByText("GMX pools", { exact: true })).toBeVisible();
    await page.waitForTimeout(800); // give the (losing) external quote a chance to arrive
    await expect(page.getByText("KyberSwap (external)")).not.toBeVisible();
    await expect(
      page.getByText("GMX pools can't fill this swap, and no external route is currently available", { exact: false })
    ).not.toBeVisible();
  });

  test("limit swap is not blocked by pool liquidity and stays on GMX pools", async ({ mount, page }) => {
    await mockKyberSuccess(page);
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="expensivePartialEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "Limit", exact: true }).click();
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).not.toHaveText("Insufficient GMX pool liquidity");

    await openExecutionDetails(page);
    await expect(page.getByText("Swap route")).toBeVisible();
    await expect(page.getByText("GMX pools", { exact: true })).toBeVisible();
  });

  test("shows a loading state while the external quote is in flight, then unblocks", async ({ mount, page }) => {
    await mockKyberSuccess(page, { delayMs: 1500 });
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Loading swap path…", { timeout: 10_000 });

    await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("0.5", { timeout: 15_000 });
    await expect(submitButton).not.toHaveText("Loading swap path…");
    await expect(submitButton).toBeEnabled();
  });

  test("an optional external quote loads in the background without blocking the button", async ({ mount, page }) => {
    await mockKyberSuccess(page, { delayMs: 1500 });
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="expensiveInternalSwap" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    // The internal route can serve the trade, so the in-flight external quote must not gate the button.
    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await expect(submitButton).not.toHaveText("Loading swap path…");

    // Once the better quote arrives it silently takes over the route.
    await openExecutionDetails(page);
    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });
    await expect(submitButton).toBeEnabled();
  });

  test("the fallback latch does NOT suppress a required external route", async ({ mount, page }) => {
    await mockKyberSuccess(page);
    await mount(<TradeBoxStory withExternalSwapHandler withExternalSwapLatchControl marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
    await expect(receiveInput).toHaveValue("0.5", { timeout: 15_000 });

    await armLatch(page);
    await page.waitForTimeout(800); // give the latch a chance to (wrongly) suppress the route

    await expect(receiveInput).toHaveValue("0.5");
    await openExecutionDetails(page);
    await expect(page.getByText("KyberSwap (external)")).toBeVisible();
  });

  test("the fallback latch suppresses an optional external route and resets on a pair change", async ({
    mount,
    page,
  }) => {
    await mockKyberSuccess(page);
    await mount(
      <TradeBoxStory withExternalSwapHandler withExternalSwapLatchControl marketScenario="expensiveInternalSwap" />
    );

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    // The expensive internal route makes the external one optional, and the better Kyber quote wins.
    await openExecutionDetails(page);
    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });

    await armLatch(page);
    await expect(page.getByText("GMX pools", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("KyberSwap (external)")).not.toBeVisible();

    // Flipping the pair (and back) is a context change that resets the latch.
    await page.locator(getDataQALocator("swap-ball")).click();
    await page.locator(getDataQALocator("swap-ball")).click();
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });
  });

  // Not covered here: the "Retry external route" tooltip (manual case C4). It needs an "optional"
  // desirability together with an insufficient-liquidity validation, which requires the swap-path
  // builder and the validation to disagree about available liquidity (OI reservations) — not
  // reachable with these fixtures. The underlying latch block-reason is unit-tested in
  // externalSwapSelectors.spec.ts.

  test("the drained pool rescue keeps working while the latch is armed (required route)", async ({ mount, page }) => {
    // Kyber quotes fine, but the pool itself can't fill the swap: the trade stays rescuable.
    await mockKyberSuccess(page);
    await mount(
      <TradeBoxStory
        connected
        withExternalSwapHandler
        withExternalSwapLatchControl
        marketScenario="expensivePartialEthPool"
      />
    );

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    // The 0.2 ETH pool can't fill $1000, so the route is required and the external quote rescues the trade.
    const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
    await expect(receiveInput).toHaveValue("0.5", { timeout: 15_000 });

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });

    await armLatch(page);
    await page.waitForTimeout(800);

    await expect(receiveInput).toHaveValue("0.5");
    await expect(submitButton).toBeEnabled();
  });

  test("no-route button tooltip links to 1inch with the pair preselected by symbols", async ({ mount, page }) => {
    await mockKyberNoRoute(page);
    await mount(<TradeBoxStory connected withExternalSwapHandler marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity", { timeout: 15_000 });

    await submitButton.hover({ force: true });
    // getByText would also match the banner's "Swap on an external aggregator" button — target the tooltip's anchor.
    const aggregatorLink = page.getByRole("link", { name: "swap on an external aggregator" });
    await expect(aggregatorLink).toBeVisible();
    // The receive side is native ETH, resolved to the "ETH" ticker.
    await expect(aggregatorLink).toHaveAttribute("href", "https://1inch.com/swap?src=42161:USDC&dst=42161:ETH");
  });

  test("with the External swaps setting off the aggregator is never asked", async ({ mount, page }) => {
    const kyber = await mockKyberSuccess(page);
    await mount(<TradeBoxStory connected withExternalSwapHandler externalSwapsSettingOff marketScenario="drainedEthPool" />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity", { timeout: 15_000 });
    await expect(
      page.getByText("GMX pools can't fill this swap, and no external route is currently available", { exact: false })
    ).not.toBeVisible();

    // No external-swap machinery involved: the tooltip is the generic liquidity one.
    await submitButton.hover({ force: true });
    await expect(
      page.getByText("GMX pools don't have enough liquidity for this swap size", { exact: false })
    ).toBeVisible();

    await page.waitForTimeout(700); // past the quote debounce
    expect(kyber.routes).toBe(0);
  });
});
