import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";

import { getDataQALocator } from "lib/__tests__/testUtils";
import { TradeMode } from "sdk/utils/trade/types";

import { TradeBoxStory } from "./TradeBox.ct.stories";

type PageLike = {
  locator: (selector: string) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
};

test.beforeEach(async ({ page }) => {
  // Hermetic: fixtures provide all data, requests to real backends are dropped
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
});

async function parseInputNumber(input: Locator): Promise<number> {
  return parseFloat((await input.inputValue()).replace(/,/g, ""));
}

async function expectInputInRange(input: Locator, min: number, max: number) {
  await expect(async () => {
    const value = await parseInputNumber(input);
    expect(value).toBeGreaterThan(min);
    expect(value).toBeLessThanOrEqual(max);
  }).toPass();
}

function selectTradeMode(page: PageLike, mode: "Market" | "Limit") {
  return page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: mode, exact: true }).click();
}

function selectTradeDirection(page: PageLike, direction: "Long" | "Short") {
  return page
    .locator(getDataQALocator("trade-direction"))
    .getByRole("button", { name: direction, exact: true })
    .click();
}

function poolSelector(page: PageLike) {
  return page.locator(getDataQALocator("pool-selector-button"));
}

async function selectPool(page: PageLike, poolName: string) {
  await poolSelector(page).click();
  await page.locator(getDataQALocator(`pool-selector-row-${poolName}`)).click();
}

async function switchSizeDisplayMode(page: PageLike, mode: "ETH" | "USD") {
  await page.locator(getDataQALocator("position-size-display-mode-button")).click();
  await page
    .locator("td")
    .filter({ hasText: new RegExp(`^${mode}$`) })
    .click();
}

test.describe("TradeBox", () => {
  test.describe("Rendering", () => {
    test("renders Long/Market defaults with connect wallet button", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const tradeModeTabs = page.locator(getDataQALocator("trade-mode"));
      await expect(tradeModeTabs.getByRole("button", { name: "Market", exact: true })).toBeVisible();
      await expect(tradeModeTabs.getByRole("button", { name: "Limit", exact: true })).toBeVisible();

      await expect(page.locator(getDataQALocator("margin-input"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size-input"))).toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Connect wallet");
      await expect(submitButton).toBeEnabled();

      await expect(page.getByText("Liquidation price")).toBeVisible();
    });
  });

  test.describe("Field interactions (Market)", () => {
    test("typing margin computes position size through real selectors", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      // default leverage 2x: ~$2000 minus open fees
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).not.toHaveValue("");
      await expectInputInRange(sizeInput, 1950, 2000);

      await expect(page.getByText(/≈\s*0\.9\d+\s+ETH/)).toBeVisible();
    });

    test("typing size derives margin (reverse anchor)", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      // $3000 at 2x -> ~1500 USDC margin + open fees
      await page.locator(getDataQALocator("position-size-input")).fill("3000");

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).not.toHaveValue("");
      await expectInputInRange(marginInput, 1490, 1520);
    });

    test("clearing margin clears size", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      await marginInput.fill("1000");
      await expect(sizeInput).not.toHaveValue("");

      await marginInput.fill("");
      await expect(sizeInput).toHaveValue("");
    });

    test("percentage slider fills margin and recomputes size", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      // 50% of the 10 000 USDC wallet balance
      await page.locator(".rc-slider-mark-text", { hasText: "50%" }).click();

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expectInputInRange(marginInput, 4999, 5000);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 9900, 10000);
    });

    test("typing size in token mode derives margin from token amount", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await switchSizeDisplayMode(page, "ETH");

      // 1 ETH * $2000 at 2x -> ~1000 USDC margin
      await page.locator(getDataQALocator("position-size-input")).fill("1");

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).not.toHaveValue("");
      await expectInputInRange(marginInput, 995, 1015);
    });
  });

  test.describe("Field interactions (Limit)", () => {
    test("margin with empty limit price computes size at mark price", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      // empty limit price falls back to mark price ($2000)
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 1950, 2000);
      await expect(page.getByText(/≈\s*0\.9\d+\s+ETH/)).toBeVisible();
    });

    test("limit price below market recomputes token size for the same margin", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await expect(page.getByText(/≈\s*0\.9\d+\s+ETH/)).toBeVisible();

      // $1000 entry doubles the token amount for the same USD size
      await page.locator(getDataQALocator("trigger-price-input")).fill("1000");

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 1950, 2000);
      await expect(page.getByText(/≈\s*1\.9\d+\s+ETH/)).toBeVisible();

      await page.locator(getDataQALocator("trigger-price-input")).fill("2000");
      await expect(page.getByText(/≈\s*0\.9\d+\s+ETH/)).toBeVisible();
    });

    test("token-mode size uses limit price to derive margin", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1000");

      await switchSizeDisplayMode(page, "ETH");
      // 2 ETH at $1000 limit price at 2x -> ~1000 USDC margin
      await page.locator(getDataQALocator("position-size-input")).fill("2");

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).not.toHaveValue("");
      await expectInputInRange(marginInput, 995, 1015);
    });

    test("limit price resets when switching trade mode", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");
      const triggerPriceInput = page.locator(getDataQALocator("trigger-price-input"));
      await triggerPriceInput.fill("1800");

      await selectTradeMode(page, "Market");
      await expect(triggerPriceInput).not.toBeVisible();

      await selectTradeMode(page, "Limit");
      await expect(triggerPriceInput).toHaveValue("");
    });

    test("margin value survives switching between Market and Limit", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1000");

      await selectTradeMode(page, "Limit");
      await expect(marginInput).toHaveValue("1000");

      await selectTradeMode(page, "Market");
      await expect(marginInput).toHaveValue("1000");
    });

    test("switching to Limit shows price field and Mark click fills mark price", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");

      const triggerPriceInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(triggerPriceInput).toBeVisible();

      await page.getByText("Mark:").click();
      await expect(triggerPriceInput).toHaveValue(/2,?000/);
    });
  });

  test.describe("Max available amount", () => {
    test("max button fills pay with full wallet balance", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await page.locator(getDataQALocator("margin-max")).click();

      // fixture wallet balance
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue(/^10,?000/);
    });
  });

  test.describe("Leverage and direction (header)", () => {
    test("changing leverage 2x to 5x recomputes size", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 1950, 2000);

      await page.locator(getDataQALocator("leverage-slider")).first().click();
      await expect(page.getByText("Adjust leverage")).toBeVisible();
      await page.getByText("5x", { exact: true }).click();

      await expectInputInRange(sizeInput, 4900, 5000);
    });

    test("switching Long to Short keeps margin and recomputes size", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Open Long");

      await page
        .locator(getDataQALocator("trade-direction"))
        .getByRole("button", { name: "Short", exact: true })
        .click();

      await expect(submitButton).toHaveText("Open Short");
      await expect(marginInput).toHaveValue("1000");
      await expectInputInRange(page.locator(getDataQALocator("position-size-input")), 1950, 2000);
    });
  });

  test.describe("Submit button validations (connected)", () => {
    test("empty amount disables submit with Enter an amount", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Enter an amount");
      await expect(submitButton).toBeDisabled();
    });

    test("pay above wallet balance shows insufficient balance error", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await page.locator(getDataQALocator("margin-input")).fill("20000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Insufficient USDC balance");
      await expect(submitButton).toBeDisabled();
    });

    test("margin below minimum shows min margin error", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      // fixture minCollateralUsd is $1
      await page.locator(getDataQALocator("margin-input")).fill("0.5");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Min margin/);
      await expect(submitButton).toBeDisabled();
    });

    test("long limit price above mark is rejected", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("2500");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Set limit price below mark price");
      await expect(submitButton).toBeDisabled();
    });

    test("long stop market price below mark is rejected", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "More" }).click();
      await page.getByText("Stop Market", { exact: true }).click();

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1500");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Set stop price above mark price");
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Existing position (Market)", () => {
    test("increase flow shows Increase Long and liquidation price transition", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      // position fixture liq price is ~$1050
      const liqRow = page.getByText("Liquidation price").locator("..");
      await expect(liqRow).toContainText(/1,?050/);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Increase Long");

      // old liq price -> recomputed one
      await expect(liqRow).toContainText(/1,?050/);
      await expect(liqRow.locator(".ValueTransition")).toBeVisible();
    });

    test("execution details show entry price of the existing position", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      await page.getByText("Execution details").click();
      const entryRow = page.getByText("Entry price").locator("..");
      await expect(entryRow).toContainText(/2,?000/);
    });
  });

  test.describe("Field interactions (Limit) - token mode", () => {
    test("limit price change in token mode keeps tokens and recomputes margin", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1000");

      await switchSizeDisplayMode(page, "ETH");
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("2");

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expectInputInRange(marginInput, 995, 1015);

      // higher limit price doubles USD size for the same 2 ETH -> margin ~2000
      await page.locator(getDataQALocator("trigger-price-input")).fill("2000");

      await expect(sizeInput).toHaveValue("2");
      await expectInputInRange(marginInput, 1990, 2030);
    });
  });

  test.describe("TP/SL", () => {
    test("valid TP keeps submit enabled, invalid TP price disables it", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Open Long");
      await expect(submitButton).toBeEnabled();

      await page.getByText("Take-Profit / Stop-Loss").click();

      const tpPriceInput = page.getByPlaceholder("TP price");
      await expect(tpPriceInput).toBeVisible();

      // valid for a long: TP above entry
      await tpPriceInput.fill("3000");
      await expect(submitButton).toBeEnabled();

      // invalid: TP below mark
      await tpPriceInput.fill("1000");
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Manual leverage mode", () => {
    const leverageDisplay = (page: PageLike) => page.locator(getDataQALocator("leverage-slider")).first();

    test("margin and size are independent inputs, leverage is derived", async ({ mount, page }) => {
      await mount(<TradeBoxStory manualLeverage />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      await marginInput.fill("1000");
      await sizeInput.fill("3000");

      // the header leverage field displays the derived estimate (~3x)
      await expect(leverageDisplay(page)).toContainText(/(2\.9\d*|3(\.0\d*)?)x/);

      await expect(marginInput).toHaveValue("1000");
      await expect(sizeInput).toHaveValue(/^3000(\.00)?$/);

      await marginInput.fill("2000");
      await expect(leverageDisplay(page)).toContainText(/(1\.4\d*|1\.5\d*)x/);
      await expect(sizeInput).toHaveValue(/^3000(\.00)?$/);
    });

    test("slider drives size as a percentage of max size at max leverage", async ({ mount, page }) => {
      await mount(<TradeBoxStory manualLeverage />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1000");

      // max size for 1000 USDC at max allowed leverage is ~$98k; 50% ~= $49k
      await page.locator(".rc-slider-mark-text", { hasText: "50%" }).click();

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 45000, 50000);

      await expect(marginInput).toHaveValue("1000");
    });

    test("changing margin re-applies the fixed slider percentage to size", async ({ mount, page }) => {
      await mount(<TradeBoxStory manualLeverage />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      await marginInput.fill("1000");
      await page.locator(".rc-slider-mark-text", { hasText: "50%" }).click();
      await expectInputInRange(sizeInput, 45000, 50000);

      // doubled margin re-applies the fixed 50%
      await marginInput.fill("2000");
      await expectInputInRange(sizeInput, 90000, 100000);
    });

    test("typing size manually stops the slider percentage from re-applying", async ({ mount, page }) => {
      await mount(<TradeBoxStory manualLeverage />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      await marginInput.fill("1000");
      await page.locator(".rc-slider-mark-text", { hasText: "50%" }).click();
      await expectInputInRange(sizeInput, 45000, 50000);

      await sizeInput.fill("3000");

      await marginInput.fill("2000");
      // leverage re-derives but the manually typed size is preserved
      await expect(leverageDisplay(page)).toContainText(/(1\.4\d*|1\.5\d*)x/);
      await expect(sizeInput).toHaveValue(/^3000(\.00)?$/);
    });

    test("size implying leverage above market cap disables submit", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected manualLeverage />);

      await page.locator(getDataQALocator("margin-input")).fill("100");
      await page.locator(getDataQALocator("position-size-input")).fill("50000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Max leverage/);
      await expect(submitButton).toBeDisabled();
    });

    test("leverage field is disabled and does not open the adjust popover", async ({ mount, page }) => {
      await mount(<TradeBoxStory manualLeverage />);

      await leverageDisplay(page).click();
      await expect(page.getByText("Adjust leverage")).not.toBeVisible();
    });

    test("order below min position size is rejected", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected manualLeverage />);

      // margin passes the $1 min collateral, but the $0.5 size is below minPositionSizeUsd
      await page.locator(getDataQALocator("margin-input")).fill("5");
      await page.locator(getDataQALocator("position-size-input")).fill("0.5");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Min position size/);
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Swap mode", () => {
    async function openSwap(page: PageLike) {
      await page.locator(getDataQALocator("trade-direction-swap")).getByRole("button", { name: "Swap" }).click();
    }

    test("computes receive from pay through the real swap path", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await openSwap(page);

      const payInput = page.locator(getDataQALocator("pay-input"));
      await expect(payInput).toBeVisible();
      await payInput.fill("1000");

      // ~0.5 ETH minus swap fees and impact
      const receiveInput = page.locator(getDataQALocator("swap-receive-input"));
      await expect(receiveInput).not.toHaveValue("");
      await expectInputInRange(receiveInput, 0.45, 0.5);

      await expect(page.getByText("Minimum receive")).toBeVisible();
    });

    test("switch ball swaps tokens and values", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await openSwap(page);

      const payInput = page.locator(getDataQALocator("pay-input"));
      const receiveInput = page.locator(getDataQALocator("swap-receive-input"));

      await payInput.fill("1000");
      await expect(receiveInput).not.toHaveValue("");

      await page.locator(getDataQALocator("swap-ball")).click();

      // the old pay amount becomes the receive anchor, pay recomputes via the reverse path
      await expect(receiveInput).toHaveValue("1000");
      await expectInputInRange(payInput, 0.5, 0.6);
    });

    test("swap limit shows ratio input and mark click fills it", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await openSwap(page);
      await selectTradeMode(page, "Limit");

      const ratioInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(ratioInput).toBeVisible();

      await page.getByText("Mark:").click();
      await expect(ratioInput).not.toHaveValue("");
    });
  });

  test.describe("TWAP mode", () => {
    async function openTwap(page: PageLike) {
      await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "More" }).click();
      await page.getByText("TWAP", { exact: true }).click();
    }

    test("renders duration, parts and per-part size", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await openTwap(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      await expect(page.getByText("Duration")).toBeVisible();
      await expect(page.getByText("Number of parts")).toBeVisible();
      await expect(page.getByText("Frequency")).toBeVisible();
      await expect(page.getByText("Size per part")).toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("TWAP: Open Long");
    });

    test("number of parts outside bounds disables submit", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await openTwap(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const partsInput = page.getByText("Number of parts").locator("..").locator("input");
      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));

      await partsInput.fill("1");
      await expect(submitButton).toHaveText(/Min TWAP parts: 2/);
      await expect(submitButton).toBeDisabled();

      await partsInput.fill("40");
      await expect(submitButton).toHaveText(/Max TWAP parts: 30/);
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("More validations (connected)", () => {
    test("limit without price shows Enter a price", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Enter a price");
      await expect(submitButton).toBeDisabled();
    });

    test("dust amount below token precision counts as no amount", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      // 7 decimals is below USDC's 6-decimals precision, parses to zero
      await page.locator(getDataQALocator("margin-input")).fill("0.0000001");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Enter an amount");
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Input sanitization", () => {
    test("comma is normalized to dot", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1,5");
      await expect(marginInput).toHaveValue("1.5");
    });

    test("non-numeric input is rejected, bare dot becomes 0.", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("abc");
      await expect(marginInput).toHaveValue("");

      await marginInput.fill(".");
      await expect(marginInput).toHaveValue("0.");
    });
  });

  test.describe("Seeded scenarios", () => {
    test("native ETH pay reserves a gas buffer on max", async ({ mount, page }) => {
      await mount(<TradeBoxStory seedPayNativeEth />);

      await page.locator(getDataQALocator("margin-max")).click();

      // max leaves a residual gas buffer, strictly below the 10 ETH balance
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expectInputInRange(marginInput, 9.5, 9.9999);
    });

    test("stored leverage above market cap is clamped on mount", async ({ mount, page }) => {
      await mount(<TradeBoxStory seedLeverageOption={150} />);

      // 150x is clamped to the market max rounded down to a 5x step
      await expect(page.locator(getDataQALocator("leverage-slider")).first()).toContainText("95x");

      // the clamped value drives the calculation: 100 USDC * 95x minus fees
      await page.locator(getDataQALocator("margin-input")).fill("100");
      await expectInputInRange(page.locator(getDataQALocator("position-size-input")), 9000, 9500);
    });

    test("persisted token denomination applies on mount", async ({ mount, page }) => {
      await mount(<TradeBoxStory seedSizeDisplayMode="token" />);

      await expect(page.locator(getDataQALocator("position-size-display-mode-button"))).toContainText("ETH");

      // token semantics from the start: 1 ETH at 2x -> ~1000 USDC margin
      await page.locator(getDataQALocator("position-size-input")).fill("1");
      await expectInputInRange(page.locator(getDataQALocator("margin-input")), 995, 1015);
    });

    test("wrap collapses trade modes to Market and converts 1:1", async ({ mount, page }) => {
      await mount(<TradeBoxStory seedSwapWrap />);

      const tradeModeTabs = page.locator(getDataQALocator("trade-mode"));
      await expect(tradeModeTabs.getByRole("button", { name: "Market", exact: true })).toBeVisible();
      await expect(tradeModeTabs.getByRole("button", { name: "Limit", exact: true })).not.toBeVisible();

      await page.locator(getDataQALocator("pay-input")).fill("1");
      await expect(page.locator(getDataQALocator("swap-receive-input"))).toHaveValue("1");
    });
  });

  test.describe("Fixture scenarios", () => {
    test("zero balances disable the slider and max fill", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected zeroBalances />);

      await expect(page.locator(".rc-slider-disabled")).toBeVisible();

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await page.locator(getDataQALocator("margin-max")).click();
      await expect(marginInput).toHaveValue("");

      await marginInput.fill("100");
      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Insufficient USDC balance");
    });

    test("capped long open interest rejects the order", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected marketScenario="cappedLongOI" />);

      // $2000 size exceeds the $1500 OI cap from the fixture
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Max ETH long exceeded/);
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Form resets", () => {
    test("gas payment token change event clears the pay input", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1000");
      await expect(page.locator(getDataQALocator("position-size-input"))).not.toHaveValue("");

      // fired in prod when the express gas token changes
      await page.evaluate(() => window.dispatchEvent(new Event("gasPaymentTokenChanged")));

      await expect(marginInput).toHaveValue("");
    });
  });

  test.describe("Trade mode fallback", () => {
    test("seeded Trigger mode falls back to Market (close flow lives outside TradeBox)", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition seedTradeMode={TradeMode.Trigger} />);

      // Trigger is not in AVAILABLE_TRADE_MODES, updateTradeMode resets it
      await expect(page.locator(getDataQALocator("margin-input"))).toBeVisible();
      await expect(page.locator(getDataQALocator("close-input"))).toHaveCount(0);
    });
  });

  test.describe("Advanced execution settings", () => {
    test("allowed slippage input warns on excessive value", async ({ mount, page }) => {
      await mount(<TradeBoxStory />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.getByText("Execution details").click();

      await expect(page.getByText("Allowed slippage")).toBeVisible();
      await expect(page.getByText("Acceptable price impact")).not.toBeVisible();

      const slippageInput = page.locator('input:right-of(:text("Allowed slippage"))').first();
      await slippageInput.fill("5");

      // above EXCESSIVE_SLIPPAGE_AMOUNT: yellow border (the error text lives in a hover tooltip)
      await expect(
        page.locator('[class*="border-yellow-500"]:right-of(:text("Allowed slippage"))').first()
      ).toBeVisible();
    });

    test("acceptable price impact input appears for limit orders and warns on high value", async ({ mount, page }) => {
      await mount(<TradeBoxStory acceptableImpactSetting />);

      await selectTradeMode(page, "Limit");
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1900");

      await page.getByText("Execution details").click();
      await expect(page.getByText("Acceptable price impact")).toBeVisible();

      const impactInput = page.locator('input:right-of(:text("Acceptable price impact"))').first();
      await impactInput.fill("5");

      // high value: yellow border (the warning text lives in a hover tooltip)
      await expect(
        page.locator('[class*="border-yellow-500"]:right-of(:text("Acceptable price impact"))').first()
      ).toBeVisible();
    });
  });

  test.describe("Price impact warnings", () => {
    test("high swap price impact shows the warning card", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected />);

      await page.locator(getDataQALocator("trade-direction-swap")).getByRole("button", { name: "Swap" }).click();
      await page.locator(getDataQALocator("pay-input")).fill("1000");

      // fixture swap impact on $1000 is far above the 0.5% threshold
      await expect(page.getByText("High swap price impact")).toBeVisible();
    });
  });

  test.describe("Pool selection", () => {
    test("switching pool keeps margin and size", async ({ mount, page }) => {
      await mount(<TradeBoxStory withSecondEthPool />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("1000");
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expectInputInRange(sizeInput, 1950, 2000);

      // pool names come from token symbols: ETH-USDC and ETH-ETH (WETH-WETH fixture)
      await page.getByText("ETH-USDC", { exact: true }).click();
      await page.getByText("ETH-ETH", { exact: true }).click();

      await expect(page.getByText("ETH-ETH", { exact: true })).toBeVisible();
      await expect(marginInput).toHaveValue("1000");

      // ETH-ETH collateral is WETH: margin is routed through a USDC -> WETH swap
      // with the default pool's negative impact, so size drops below 2x
      await expectInputInRange(sizeInput, 1750, 1950);
    });

    test("suggests the pool with lower price impact", async ({ mount, page }) => {
      await mount(<TradeBoxStory connected withSecondEthPool />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      // the ETH-ETH fixture pool has no negative impact and a lower open fee
      const switchLink = page.getByText(/Switch to ETH-ETH pool/);
      await expect(switchLink).toBeVisible();

      await switchLink.click();

      await expect(page.getByText(/Switch to ETH-ETH pool/)).not.toBeVisible();
      await expect(page.getByText("ETH-ETH", { exact: true })).toBeVisible();
    });

    test("keeps the manually picked pool when the direction is switched away and back", async ({ mount, page }) => {
      await mount(<TradeBoxStory withSecondEthPool />);

      await selectPool(page, "ETH-ETH");
      await expect(poolSelector(page)).toContainText("ETH-ETH");

      await selectTradeDirection(page, "Short");
      await expect(poolSelector(page)).toContainText("ETH-USDC");

      await selectTradeDirection(page, "Long");
      await expect(poolSelector(page)).toContainText("ETH-ETH");
    });

    test("existing position pool wins over the remembered pool", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition withSecondEthPool seedUserSelectedSecondEthPool />);

      await expect(poolSelector(page)).toContainText("ETH-USDC");

      await selectTradeDirection(page, "Short");
      await expect(poolSelector(page)).toContainText("ETH-ETH");

      await selectTradeDirection(page, "Long");
      await expect(poolSelector(page)).toContainText("ETH-USDC");
    });

    test("stored options without the remembered pool field keep working", async ({ mount, page }) => {
      await mount(<TradeBoxStory withSecondEthPool seedTradeMode={TradeMode.Limit} />);

      await expect(page.locator(getDataQALocator("trigger-price-input"))).toBeVisible();
      await expect(poolSelector(page)).toContainText("ETH-USDC");

      await selectPool(page, "ETH-ETH");
      await selectTradeDirection(page, "Short");
      await selectTradeDirection(page, "Long");
      await expect(poolSelector(page)).toContainText("ETH-ETH");
    });
  });

  test.describe("Collateral warnings", () => {
    test("warns when existing position uses different collateral and switches on click", async ({ mount, page }) => {
      await mount(<TradeBoxStory withWethCollateralPosition />);

      await expect(page.getByText(/Existing position uses ETH collateral/)).toBeVisible();

      await page.getByText("Switch to ETH collateral").click();

      await expect(page.getByText(/Existing position uses ETH collateral/)).not.toBeVisible();
    });
  });
});
