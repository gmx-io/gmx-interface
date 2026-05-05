import { test, expect } from "@playwright/experimental-ct-react";

import { getDataQALocator } from "lib/__tests__/testUtils";
import { TradeMode } from "sdk/utils/trade/types";

import {
  IntegrationStory,
  IntegrationNoTriggerCallbackStory,
  PriceChangeStory,
  LeverageOffStory,
  EthMarginPriceChangeStory,
  MaxAvailableDivergenceStory,
} from "./TradeboxMarginFieldsIntegration.ct.stories";

test.describe("TradeboxMarginFields Integration", () => {
  test.describe("Rendering structure", () => {
    test("does NOT render PriceField when onTriggerPriceInputChange is undefined", async ({ mount, page }) => {
      await mount(<IntegrationNoTriggerCallbackStory />);

      await expect(page.locator(getDataQALocator("trigger-price"))).toHaveCount(0);
      await expect(page.getByText("Limit price")).not.toBeVisible();
    });
  });

  test.describe("Margin input handling", () => {
    test("typing in margin sets focused input to 'from'", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("500");

      await expect(page.getByTestId("focused-input")).toHaveText("from");
      await expect(page.getByTestId("from-value")).toHaveText("500");
    });

    test("max button fills margin from maxAvailableAmount", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" />);

      const maxButton = page.locator(getDataQALocator("margin-max"));
      await maxButton.click();

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const value = await marginInput.inputValue();
      expect(Number(value.replace(/,/g, ""))).toBeGreaterThan(0);
    });

    test("max button no-ops when maxAvailableAmount is 0n", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" maxAvailableAmount={0n} />);

      // Balance button may not exist when balance is defined but max is 0
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("");
    });
  });

  test.describe("Size input - token display mode", () => {
    test("typing in token mode directly updates toTokenInputValue", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      // Type in size field
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("2.5");

      await expect(sizeInput).toHaveValue("2.5");
      await expect(page.getByTestId("to-value")).toHaveText("2.5");
    });

    test("sizeFieldInputValue equals toTokenInputValue in token mode", async ({ mount, page }) => {
      await mount(<IntegrationStory initialToValue="1.25" />);

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      // Value should reflect the toTokenInputValue
      const value = await sizeInput.inputValue();
      expect(value).toBeTruthy();
    });
  });

  test.describe("Size input - USD display mode", () => {
    test("typing in USD mode updates the displayed value", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("5000");

      await expect(sizeInput).toHaveValue("5000");
    });

    test("USD mode converts to tokens when canConvert", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="1000" initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("4000");

      // toValue should be updated with the converted token amount
      // $4000 at $2000/ETH = 2 ETH
      await expect(page.getByTestId("to-value")).toHaveText("2");
    });

    test("sizeFieldInputValue equals sizeInputValue in USD mode", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("7777");
      await expect(sizeInput).toHaveValue("7777");
    });
  });

  test.describe("Display mode toggle", () => {
    test("switching to token mode converts USD to tokens", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      // Type a USD value first
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("4000");

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      // Input should now show token amount (4000 USD / 2000 price = 2 ETH)
      await expect(sizeInput).toHaveValue("2");
    });

    test("switching to USD mode converts tokens to USD", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      // Switch to token mode first
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      // Type a token amount
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("1.5");

      // Switch back to USD
      await toggle.click();
      await page.locator("td").filter({ hasText: /^USD$/ }).click();

      // Input should show USD value (1.5 ETH * 2000 = 3000)
      await expect(sizeInput).toHaveValue("3000.00");
    });

    test("no-op when switching to already-active mode", async ({ mount, page }) => {
      await mount(<IntegrationStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("5000");

      // Already in USD mode, opening and selecting USD again
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^USD$/ }).click();

      // Value should remain unchanged
      await expect(sizeInput).toHaveValue("5000");
    });
  });

  test.describe("Percentage slider", () => {
    test("slider is visible with leverage slider enabled (margin mode)", async ({ mount, page }) => {
      await mount(<IntegrationStory isLeverageSliderEnabled={true} initialFromValue="5000" />);

      await expect(page.locator(".rc-slider")).toBeVisible();
      // Marks should be visible
      for (const mark of ["0%", "25%", "50%", "75%", "100%"]) {
        await expect(page.getByText(mark).first()).toBeVisible();
      }
    });

    test("slider is visible with leverage slider disabled (size mode)", async ({ mount, page }) => {
      await mount(<IntegrationStory isLeverageSliderEnabled={false} />);

      await expect(page.locator(".rc-slider")).toBeVisible();
    });
  });

  test.describe("Margin percentage ↔ slider", () => {
    test("slider reflects initial margin as percentage of max", async ({ mount, page }) => {
      // 5000 USDC of 10000 USDC max = 50%
      await mount(<IntegrationStory initialFromValue="5000" isLeverageSliderEnabled={true} />);

      const handle = page.locator(".rc-slider-handle");
      await expect(handle).toHaveAttribute("aria-valuenow", "50");
    });

    test("typing margin updates slider position", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" isLeverageSliderEnabled={true} />);

      const handle = page.locator(".rc-slider-handle");
      await expect(handle).toHaveAttribute("aria-valuenow", "0");

      // Type 2500 of 10000 max = 25%
      await page.locator(getDataQALocator("margin-input")).fill("2500");
      await expect(handle).toHaveAttribute("aria-valuenow", "25");
    });

    test("typing 100% of max moves slider to 100", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" isLeverageSliderEnabled={true} />);

      await page.locator(getDataQALocator("margin-input")).fill("10000");
      await expect(page.locator(".rc-slider-handle")).toHaveAttribute("aria-valuenow", "100");
    });

    test("clearing margin resets slider to 0", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="5000" isLeverageSliderEnabled={true} />);

      const handle = page.locator(".rc-slider-handle");
      await expect(handle).toHaveAttribute("aria-valuenow", "50");

      await page.locator(getDataQALocator("margin-input")).fill("");
      await expect(handle).toHaveAttribute("aria-valuenow", "0");
    });
  });

  test.describe("Size conversion price", () => {
    test("uses mark price for market orders", async ({ mount, page }) => {
      await mount(<IntegrationStory tradeMode={TradeMode.Market} />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("2000");

      // $2000 / $2000 mark price = 1 ETH
      await expect(page.getByTestId("to-value")).toHaveText("1");
    });

    test("shows trigger price input for limit orders", async ({ mount, page }) => {
      await mount(<IntegrationStory tradeMode={TradeMode.Limit} initialTriggerPrice="1800" />);

      const priceInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(priceInput).toHaveValue("1800");
    });
  });

  test.describe("Passive USD sync", () => {
    test("does not overwrite size when user is focused on size field", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.focus();
      await sizeInput.fill("12345");

      // User is focused on size field
      await expect(page.getByTestId("focused-input")).toHaveText("to");

      // Price change triggers passive USD sync
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Value should remain what user typed, not be overwritten by sync
      await expect(sizeInput).toHaveValue("12345");
    });
  });

  test.describe("Field recalculation on price change", () => {
    test("USD mode: size updates when price changes and margin is focused", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      const marginInput = page.locator(getDataQALocator("margin-input"));

      // Initial: 1 ETH * $2000 = $2000.00
      await expect(sizeInput).toHaveValue("2000.00");
      await expect(marginInput).toHaveValue("1000");

      // Change price to $2500
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Size updates: 1 ETH * $2500 = $2500.00
      await expect(sizeInput).toHaveValue("2500.00");
      // Margin stays
      await expect(marginInput).toHaveValue("1000");
    });

    test("token mode: size unchanged when price changes", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveValue("1");

      // Change price
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Token amount unchanged
      await expect(sizeInput).toHaveValue("1");
      // Margin unchanged
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });

    test("100% margin unchanged after price change (USD mode)", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="10000" initialToValue="5" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("10000");

      await component.update(<PriceChangeStory initialFromValue="10000" initialToValue="5" ethPrice={3000} />);

      // Margin stays at 100%
      await expect(marginInput).toHaveValue("10000");
      // Size updates: 5 ETH * $3000
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("15000.00");
    });

    test("100% margin unchanged after price change (token mode)", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="10000" initialToValue="5" />);

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      await component.update(<PriceChangeStory initialFromValue="10000" initialToValue="5" ethPrice={3000} />);

      // Margin unchanged
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("10000");
      // Token amount unchanged
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("5");
    });

    test("focused size field is NOT overwritten by price change", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("5000");

      await expect(page.getByTestId("focused-input")).toHaveText("to");

      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Protected by focusedInput="to"
      await expect(sizeInput).toHaveValue("5000");
    });

    test("margin set via input then price change: margin stays, size updates", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="" initialToValue="2" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("5000");
      await expect(page.getByTestId("focused-input")).toHaveText("from");

      // Initial: 2 ETH * $2000 = $4000
      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveValue("4000.00");

      await component.update(<PriceChangeStory initialFromValue="" initialToValue="2" ethPrice={2500} />);

      // Margin stays
      await expect(marginInput).toHaveValue("5000");
      // Size updates: 2 ETH * $2500
      await expect(sizeInput).toHaveValue("5000.00");
    });

    test("switching USD→token after price change shows correct token amount", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveValue("2000.00");

      // Price doubles
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={3000} />);
      await expect(sizeInput).toHaveValue("3000.00");

      // Switch to token — underlying amount should still be 1 ETH
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      await expect(sizeInput).toHaveValue("1");
    });

    test("after unfocusing size, next price change recalculates USD", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      // Type in size (focused=to)
      await sizeInput.fill("6000");
      await expect(page.getByTestId("focused-input")).toHaveText("to");

      // Focus margin (focused=from)
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.focus();
      await expect(page.getByTestId("focused-input")).toHaveText("from");

      // Now price change should recalculate size USD
      // toTokenInputValue was set to usdToTokens("6000") at $2000 = "3"
      // After price → $2500: tokensToUsd("3") = $7500
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);
      await expect(sizeInput).toHaveValue("7500.00");
      await expect(marginInput).toHaveValue("1000");
    });
  });

  test.describe("Manual leverage OFF (slider drives size)", () => {
    test("clicking slider mark updates size, margin stays fixed", async ({ mount, page }) => {
      await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      await expect(marginInput).toHaveValue("1000");

      // Click 50% mark on slider — should set size to ~50% of max
      const mark50 = page.locator(".rc-slider-mark-text").filter({ hasText: "50%" });
      await mark50.click();

      // Size should be non-empty (slider drove size)
      const sizeValue = await sizeInput.inputValue();
      expect(sizeValue).toBeTruthy();
      expect(Number(sizeValue)).toBeGreaterThan(0);

      // Margin must stay unchanged
      await expect(marginInput).toHaveValue("1000");
    });

    test("clicking 100% mark sets size to max, margin unchanged", async ({ mount, page }) => {
      await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      const mark100 = page.locator(".rc-slider-mark-text").filter({ hasText: "100%" });
      await mark100.click();

      const sizeValue = await sizeInput.inputValue();
      expect(sizeValue).toBeTruthy();
      expect(Number(sizeValue)).toBeGreaterThan(0);

      await expect(marginInput).toHaveValue("1000");
    });

    test("100% slider yields larger size than 50%", async ({ mount, page }) => {
      await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      // Set 50%
      await page.locator(".rc-slider-mark-text").filter({ hasText: "50%" }).click();
      const size50 = Number(await sizeInput.inputValue());

      // Set 100%
      await page.locator(".rc-slider-mark-text").filter({ hasText: "100%" }).click();
      const size100 = Number(await sizeInput.inputValue());

      expect(size100).toBeGreaterThan(size50);
    });

    test("typing in size field directly works with leverage off", async ({ mount, page }) => {
      await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("5000");

      await expect(sizeInput).toHaveValue("5000");
      await expect(page.getByTestId("focused-input")).toHaveText("to");
      // Margin unchanged
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });

    test("price change updates USD size with leverage off (margin focused)", async ({ mount, page }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      const marginInput = page.locator(getDataQALocator("margin-input"));

      // Initial: 1 ETH * $2000
      await expect(sizeInput).toHaveValue("2000.00");

      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Size updates: 1 ETH * $2500
      await expect(sizeInput).toHaveValue("2500.00");
      // Margin stays
      await expect(marginInput).toHaveValue("1000");
    });

    test("token mode: size stays fixed on price change with leverage off", async ({ mount, page }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="1" />);

      // Switch to token mode
      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveValue("1");

      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);

      // Token amount unchanged
      await expect(sizeInput).toHaveValue("1");
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });
  });

  test.describe("ETH margin (pay token ≠ collateral)", () => {
    test("USD mode: margin (ETH) stays, size updates on price change", async ({ mount, page }) => {
      const component = await mount(<EthMarginPriceChangeStory initialFromValue="5" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      const marginInput = page.locator(getDataQALocator("margin-input"));

      await expect(sizeInput).toHaveValue("2000.00");
      await expect(marginInput).toHaveValue("5");

      await component.update(<EthMarginPriceChangeStory initialFromValue="5" initialToValue="1" ethPrice={2500} />);

      await expect(sizeInput).toHaveValue("2500.00");
      await expect(marginInput).toHaveValue("5");
    });

    test("token mode: margin (ETH) stays, size in tokens unchanged on price change", async ({ mount, page }) => {
      const component = await mount(<EthMarginPriceChangeStory initialFromValue="5" initialToValue="1" />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveValue("1");

      await component.update(<EthMarginPriceChangeStory initialFromValue="5" initialToValue="1" ethPrice={2500} />);

      await expect(sizeInput).toHaveValue("1");
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("5");
    });

    test("100% margin (ETH) unchanged after price change (USD mode)", async ({ mount, page }) => {
      const component = await mount(<EthMarginPriceChangeStory initialFromValue="10" initialToValue="5" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("10");

      await component.update(<EthMarginPriceChangeStory initialFromValue="10" initialToValue="5" ethPrice={3000} />);

      await expect(marginInput).toHaveValue("10");
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("15000.00");
    });

    test("100% margin (ETH) unchanged after price change (token mode)", async ({ mount, page }) => {
      const component = await mount(<EthMarginPriceChangeStory initialFromValue="10" initialToValue="5" />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      await component.update(<EthMarginPriceChangeStory initialFromValue="10" initialToValue="5" ethPrice={3000} />);

      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("10");
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("5");
    });

    test("after typing margin (ETH), price change: margin stays, size updates", async ({ mount, page }) => {
      const component = await mount(<EthMarginPriceChangeStory initialFromValue="" initialToValue="2" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("5");
      await expect(page.getByTestId("focused-input")).toHaveText("from");

      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("4000.00");

      await component.update(<EthMarginPriceChangeStory initialFromValue="" initialToValue="2" ethPrice={2500} />);

      await expect(marginInput).toHaveValue("5");
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("5000.00");
    });
  });

  test.describe("Manual leverage OFF — slider sync on price change", () => {
    test("slider 50% then price change: token amount recalculates, margin stays", async ({ mount, page }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      await page.locator(".rc-slider-mark-text").filter({ hasText: "50%" }).click();
      const tokensBefore = await page.getByTestId("to-value").textContent();
      expect(Number(tokensBefore)).toBeGreaterThan(0);

      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="" ethPrice={2500} />);

      // With USDC margin, USD stays ~stable but token count changes with price
      await expect(page.getByTestId("to-value")).not.toHaveText(tokensBefore!);
      expect(Number(await page.getByTestId("to-value").textContent())).toBeGreaterThan(0);
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });

    test("slider 100% then price change: token amount updates to new max, margin stays", async ({ mount, page }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      await page.locator(".rc-slider-mark-text").filter({ hasText: "100%" }).click();
      const tokensBefore = await page.getByTestId("to-value").textContent();
      expect(Number(tokensBefore)).toBeGreaterThan(0);

      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="" ethPrice={2500} />);

      await expect(page.getByTestId("to-value")).not.toHaveText(tokensBefore!);
      expect(Number(await page.getByTestId("to-value").textContent())).toBeGreaterThan(0);
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });

    test("after typing in size field, price change uses passive sync only (no slider sync)", async ({
      mount,
      page,
    }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      // Use slider first
      await page.locator(".rc-slider-mark-text").filter({ hasText: "50%" }).click();

      // Then type in size field — sets lastInteraction to "field"
      await sizeInput.fill("5000");
      await expect(page.getByTestId("focused-input")).toHaveText("to");

      // Focus margin so passive sync can fire
      await page.locator(getDataQALocator("margin-input")).focus();
      await expect(page.getByTestId("focused-input")).toHaveText("from");

      // Price change — slider sync should NOT fire, only passive USD sync
      // toTokenInputValue was set to usdToTokens("5000") at $2000 = "2.5" ETH
      // After price $2500: tokensToUsd("2.5") = "6250.00"
      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="" ethPrice={2500} />);
      await expect(sizeInput).toHaveValue("6250.00");
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });

    test("slider 50% then price change in token mode: token amount recalculates", async ({ mount, page }) => {
      const component = await mount(<LeverageOffStory initialFromValue="1000" initialToValue="" />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      await page.locator(".rc-slider-mark-text").filter({ hasText: "50%" }).click();

      const tokensBefore = await page.getByTestId("to-value").textContent();
      expect(Number(tokensBefore)).toBeGreaterThan(0);

      await component.update(<LeverageOffStory initialFromValue="1000" initialToValue="" ethPrice={2500} />);

      // Token amount should change (auto-retries until value differs)
      await expect(page.getByTestId("to-value")).not.toHaveText(tokensBefore!);
      expect(Number(await page.getByTestId("to-value").textContent())).toBeGreaterThan(0);
      await expect(page.locator(getDataQALocator("margin-input"))).toHaveValue("1000");
    });
  });

  test.describe("Anchor behavior (last focused field)", () => {
    test("anchor=margin: typing margin then slider click updates margin, size stays", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="" initialToValue="1" isLeverageSliderEnabled={true} />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      // Type margin — sets anchor to margin
      await marginInput.fill("5000");

      // Click 25% on slider — overwrites margin to 25% of 10000 = 2500
      await page.locator(".rc-slider-mark-text").filter({ hasText: "25%" }).click();
      await expect(marginInput).toHaveValue("2500");

      // Size input is unaffected by margin slider
      await expect(sizeInput).toBeVisible();
    });

    test("anchor=size: typing size then slider click updates margin, size unchanged", async ({ mount, page }) => {
      await mount(<IntegrationStory initialFromValue="1000" initialToValue="" isLeverageSliderEnabled={true} />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      // Type size — sets anchor to size
      await sizeInput.fill("5000");
      await expect(sizeInput).toHaveValue("5000");

      // Click 50% on slider — updates margin to 50% of 10000 = 5000
      await page.locator(".rc-slider-mark-text").filter({ hasText: "50%" }).click();
      // Wait for slider to settle at 50 before checking margin
      await expect(page.locator(".rc-slider-handle")).toHaveAttribute("aria-valuenow", "50");
      await expect(marginInput).toHaveValue("5000");

      // Size stays (slider drives margin, not size, in leverage ON mode)
      // Passive sync reformats to "5000.00" after focus returns to margin
      await expect(sizeInput).toHaveValue("5000.00");
    });

    test("anchor=size: price change does NOT overwrite user-typed size", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("9999");

      // Price change — size is protected because anchor is size
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="" ethPrice={2500} />);
      await expect(sizeInput).toHaveValue("9999");
    });

    test("anchor=margin: price change recalculates size USD", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="" initialToValue="2" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      // Type margin — sets anchor to margin
      await marginInput.fill("5000");

      // Initial: 2 ETH * $2000 = $4000
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("4000.00");

      // Price change → size updates because anchor is margin
      await component.update(<PriceChangeStory initialFromValue="" initialToValue="2" ethPrice={2500} />);
      await expect(page.locator(getDataQALocator("position-size-input"))).toHaveValue("5000.00");
      await expect(marginInput).toHaveValue("5000");
    });

    test("switching anchor: type size, then focus margin, price change now updates size", async ({ mount, page }) => {
      const component = await mount(<PriceChangeStory initialFromValue="1000" initialToValue="1" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      const marginInput = page.locator(getDataQALocator("margin-input"));

      // Type size — anchor is now size
      await sizeInput.fill("6000");
      await expect(sizeInput).toHaveValue("6000");

      // Focus margin — switches anchor to margin
      await marginInput.focus();

      // Price change → size updates (anchor switched to margin)
      // toTokenInputValue was set to usdToTokens("6000") at $2000 = "3"
      // After price $2500: tokensToUsd("3") = "7500.00"
      await component.update(<PriceChangeStory initialFromValue="1000" initialToValue="1" ethPrice={2500} />);
      await expect(sizeInput).toHaveValue("7500.00");
      await expect(marginInput).toHaveValue("1000");
    });
  });

  test.describe("maxAvailableAmount vs balance", () => {
    test("100% slider fills to maxAvailableAmount, not wallet balance", async ({ mount, page }) => {
      // USDC_TOKEN.balance = 10000, but maxAvailableAmount = 5000
      await mount(<MaxAvailableDivergenceStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));

      // Click 100% mark on slider
      const mark100 = page.locator(".rc-slider-mark-text").filter({ hasText: "100%" });
      await mark100.click();

      // Should fill to 5000 (maxAvailableAmount), not 10000 (wallet balance)
      await expect(marginInput).toHaveValue("5000");
    });
  });
});
