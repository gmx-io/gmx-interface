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

// 1 WETH -> 2000 USDC
const WETH_TO_USDC_SUMMARY: Partial<typeof ROUTE_SUMMARY> = {
  tokenIn: WETH_ADDRESS,
  amountIn: "1000000000000000000",
  amountInUsd: "2000",
  tokenOut: USDC_ADDRESS,
  amountOut: "2000000000",
  amountOutUsd: "2000",
};

async function mockKyberSuccess(
  page: Page,
  {
    delayMs = 0,
    amountOut,
    amountOutUsd,
    summary: summaryOverride,
  }: { delayMs?: number; amountOut?: string; amountOutUsd?: string; summary?: Partial<typeof ROUTE_SUMMARY> } = {}
) {
  const summary = {
    ...ROUTE_SUMMARY,
    ...summaryOverride,
    ...(amountOut !== undefined ? { amountOut } : {}),
    ...(amountOutUsd !== undefined ? { amountOutUsd } : {}),
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

    const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
    await expect(receiveInput).toHaveValue("0.5", { timeout: 15_000 });

    await openExecutionDetails(page);
    await expect(page.getByText("Swap route")).toBeVisible();
    await expect(page.getByText("KyberSwap (external)")).toBeVisible();
  });

  test("shows the no-route banner with an aggregator escape when Kyber has nothing either", async ({ mount, page }) => {
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

    await expect(page.getByText("TWAP swaps use GMX pool liquidity only", { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity");
    await submitButton.hover({ force: true });
    await expect(page.getByText("Switch to a market order")).toBeVisible();

    await page.getByText("Switch to market order", { exact: true }).click();

    await expect(page.getByText("TWAP swaps use GMX pool liquidity only")).not.toBeVisible();
    await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("0.5", { timeout: 15_000 });
  });

  test("keeps a healthy swap on GMX pools when the external quote is worse", async ({ mount, page }) => {
    // 1000 USDC -> 0.4 ETH ($800): clearly worse than the internal route.
    await mockKyberSuccess(page, { amountOut: "400000000000000000", amountOutUsd: "800" });
    await mount(<TradeBoxStory withExternalSwapHandler />);

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

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

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await expect(submitButton).not.toHaveText("Loading swap path…");

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

  test("a latched optional route raises the paused banner, and its Retry brings the external route back", async ({
    mount,
    page,
  }) => {
    await mockKyberSuccess(page);
    await mount(
      <TradeBoxStory withExternalSwapHandler withExternalSwapLatchControl marketScenario="expensiveInternalSwap" />
    );

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    await openExecutionDetails(page);
    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });

    await armLatch(page);
    await expect(page.getByText("Retry to check for a better rate", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("GMX pools", { exact: true })).toBeVisible();

    await page.getByText("Retry external route").click();

    await expect(page.getByText("Retry to check for a better rate")).not.toBeVisible();
    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });
  });

  test("after dismissing the paused banner the Swap route row still explains and retries the pause", async ({
    mount,
    page,
  }) => {
    await mockKyberSuccess(page);
    await mount(
      <TradeBoxStory withExternalSwapHandler withExternalSwapLatchControl marketScenario="expensiveInternalSwap" />
    );

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    await openExecutionDetails(page);
    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });

    await armLatch(page);
    await expect(page.getByText("Retry to check for a better rate", { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    // The close button is icon-only (no accessible name).
    await page
      .locator("div.border-l-2", { hasText: "Retry to check for a better rate" })
      .locator("button")
      .filter({ hasText: /^$/ })
      .click();
    await expect(page.getByText("Retry to check for a better rate")).not.toBeVisible();

    const routeValue = page.getByText("GMX pools", { exact: true });
    await expect(routeValue).toBeVisible();
    await routeValue.hover();
    await expect(
      page.getByText("External routing is temporarily paused after a failed attempt", { exact: false })
    ).toBeVisible();
    await page.getByText("Retry external route").click();

    await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });
  });

  test("the drained pool rescue keeps working while the latch is armed (required route)", async ({ mount, page }) => {
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

  test.describe("Position increase with a collateral swap", () => {
    test("a required external route rescues the increase", async ({ mount, page }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory connected withExternalSwapHandler seedIncreaseCollateralSwap marketScenario="drainedUsdcPool" />
      );

      await page.locator(getDataQALocator("margin-input")).fill("1");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toBeEnabled({ timeout: 15_000 });
      await expect(submitButton).not.toHaveText("Insufficient liquidity to swap collateral");
    });

    test("with no external route either, the increase blocks and raises the no-route banner", async ({
      mount,
      page,
    }) => {
      await mockKyberNoRoute(page);
      await mount(
        <TradeBoxStory connected withExternalSwapHandler seedIncreaseCollateralSwap marketScenario="drainedUsdcPool" />
      );

      await page.locator(getDataQALocator("margin-input")).fill("1");

      await expect(
        page.getByText("GMX pools can't fill this swap, and no external route is currently available", { exact: false })
      ).toBeVisible({ timeout: 15_000 });

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toBeDisabled();
    });
  });

  // Express is available (feature flags + sponsored calls mocked on), the default gas payment token
  // on Arbitrum is USDC, and the swap receives USDC — the gas-conflict scenarios out of the box.
  test.describe("Gas conflict (express)", () => {
    const WETH_TO_USDC_PAIR = { from: WETH_ADDRESS, to: USDC_ADDRESS };

    test("silently auto-switches the conflicting gas token and keeps the entered amount", async ({ mount, page }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory
          connected
          withExternalSwapHandler
          expressOn
          hugeGasTokenBalances
          marketScenario="drainedUsdcPool"
          seedSwapPair={WETH_TO_USDC_PAIR}
        />
      );

      const payInput = page.locator(getDataQALocator("pay-input"));
      await payInput.fill("1");

      await expect(page.getByText("Gas token switched to ETH to enable external swap routing")).toBeVisible({
        timeout: 15_000,
      });

      // The regression this flow was built around: the switch must NOT clear the pay input.
      await expect(payInput).toHaveValue("1");
      await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("2000", { timeout: 15_000 });
    });

    test("re-picking the conflicting gas token shows the red banner instead of fighting the user", async ({
      mount,
      page,
    }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory
          connected
          withExternalSwapHandler
          withGasTokenControl
          expressOn
          hugeGasTokenBalances
          marketScenario="drainedUsdcPool"
          seedSwapPair={WETH_TO_USDC_PAIR}
        />
      );

      const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
      await page.locator(getDataQALocator("pay-input")).fill("1");

      // First the silent auto-switch resolves the conflict (spends its one attempt for this pair)...
      await expect(page.getByText("Gas token switched to ETH to enable external swap routing")).toBeVisible({
        timeout: 15_000,
      });
      await expect(receiveInput).toHaveValue("2000", { timeout: 15_000 });

      await page.locator(getDataQALocator("test-set-conflicting-gas-token")).click();

      await expect(page.getByText("This swap requires external routing. Pay gas in ETH to enable it.")).toBeVisible({
        timeout: 15_000,
      });

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Insufficient GMX pool liquidity");
      await submitButton.hover({ force: true });
      await expect(
        page.getByText("gas payment token matches the token you're swapping to", { exact: false })
      ).toBeVisible();

      await page.getByText("Use ETH for gas").click();

      await expect(
        page.getByText("This swap requires external routing. Pay gas in ETH to enable it.")
      ).not.toBeVisible();
      await expect(receiveInput).toHaveValue("2000", { timeout: 15_000 });
    });

    test("with no viable gas-token candidate offers the Classic Trading escape", async ({ mount, page }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory
          connected
          withExternalSwapHandler
          expressOn
          zeroWethBalance
          marketScenario="drainedUsdcPool"
          seedSwapPair={WETH_TO_USDC_PAIR}
        />
      );

      await page.locator(getDataQALocator("pay-input")).fill("1");

      await expect(page.getByText("no other gas token has sufficient balance", { exact: false })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByText("Switch to Classic Trading").click();

      // Classic transactions don't pay gas through the relay, so the conflict is gone and the quote lands.
      await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("2000", { timeout: 15_000 });
    });

    test("optional route blocked by the gas conflict shows the better-rate hint", async ({ mount, page }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory
          connected
          withExternalSwapHandler
          expressOn
          hugeGasTokenBalances
          marketScenario="expensiveInternalSwap"
          seedSwapPair={WETH_TO_USDC_PAIR}
        />
      );

      await page.locator(getDataQALocator("pay-input")).fill("1");

      await expect(page.getByText("Paying gas in ETH may give a better rate on this swap")).toBeVisible({
        timeout: 15_000,
      });

      await page.getByText("Use ETH for gas").click();

      await openExecutionDetails(page);
      await expect(page.getByText("KyberSwap (external)")).toBeVisible({ timeout: 15_000 });
    });

    test("One-Click Trading takes priority over the gas conflict and explains itself", async ({ mount, page }) => {
      await mockKyberSuccess(page, { summary: WETH_TO_USDC_SUMMARY });
      await mount(
        <TradeBoxStory
          connected
          withExternalSwapHandler
          expressOn
          withOneClickSubaccount
          hugeGasTokenBalances
          marketScenario="drainedUsdcPool"
          seedSwapPair={WETH_TO_USDC_PAIR}
        />
      );

      await page.locator(getDataQALocator("pay-input")).fill("1");

      await expect(
        page.getByText("This swap requires external routing, which isn't available with One-Click Trading", {
          exact: false,
        })
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Disable One-Click Trading")).toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Insufficient GMX pool liquidity");
      await submitButton.hover({ force: true });
      await expect(page.getByText("Disable One-Click Trading to proceed", { exact: false })).toBeVisible();
    });
  });

  test("with the External swaps setting off the aggregator is never asked", async ({ mount, page }) => {
    const kyber = await mockKyberSuccess(page);
    await mount(
      <TradeBoxStory connected withExternalSwapHandler externalSwapsSettingOff marketScenario="drainedEthPool" />
    );

    await openSwap(page);
    await page.locator(getDataQALocator("pay-input")).fill("1000");

    const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
    await expect(submitButton).toHaveText("Insufficient GMX pool liquidity", { timeout: 15_000 });
    await expect(
      page.getByText("GMX pools can't fill this swap, and no external route is currently available", { exact: false })
    ).not.toBeVisible();

    await submitButton.hover({ force: true });
    await expect(
      page.getByText("GMX pools don't have enough liquidity for this swap size", { exact: false })
    ).toBeVisible();

    await page.waitForTimeout(700); // past the quote debounce
    expect(kyber.routes).toBe(0);
  });
});
