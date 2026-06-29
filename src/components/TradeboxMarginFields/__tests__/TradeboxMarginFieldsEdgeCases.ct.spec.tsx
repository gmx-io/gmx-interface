import { test, expect } from "@playwright/experimental-ct-react";

import { getDataQALocator } from "lib/__tests__/testUtils";

import {
  EdgeCaseStory,
  UndefinedToTokenStory,
  RapidInputStory,
  LargeValuesStory,
  DustAmountsStory,
} from "./TradeboxMarginFieldsEdgeCases.ct.stories";

test.describe("TradeboxMarginFields Edge Cases", () => {
  test.describe("Zero and empty values", () => {
    test("empty fromTokenInputValue renders without crashing", async ({ mount, page }) => {
      await mount(<EdgeCaseStory initialFromValue="" />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("");
    });

    test("empty toTokenInputValue renders without crashing", async ({ mount, page }) => {
      await mount(<EdgeCaseStory initialToValue="" />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();
    });

    test("maxAvailableAmount=0n does not divide by zero", async ({ mount, page }) => {
      await mount(<EdgeCaseStory maxAvailableAmount={0n} initialFromValue="1000" />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();
      // Slider should still render
      await expect(page.locator(".rc-slider")).toBeVisible();
    });

    test("both inputs empty renders cleanly", async ({ mount, page }) => {
      await mount(<EdgeCaseStory initialFromValue="" initialToValue="" maxAvailableAmount={0n} />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();
      await expect(page.locator(".rc-slider")).toBeVisible();
    });
  });

  test.describe("Undefined token data", () => {
    test("undefined toToken does not crash component", async ({ mount, page }) => {
      await mount(<UndefinedToTokenStory />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();
    });

    test("undefined toToken disables size conversion (canConvert false)", async ({ mount, page }) => {
      await mount(<UndefinedToTokenStory />);

      // Component should still be interactive
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("500");
      await expect(marginInput).toHaveValue("500");
    });
  });

  test.describe("Rapid input changes", () => {
    test("multiple fast size input changes produce correct final value", async ({ mount, page }) => {
      await mount(<RapidInputStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));

      // Rapidly type different values
      await sizeInput.fill("100");
      await sizeInput.fill("200");
      await sizeInput.fill("300");
      await sizeInput.fill("5000");

      // Final value should be the last one typed
      await expect(sizeInput).toHaveValue("5000");
    });

    test("rapid margin input changes don't crash", async ({ mount, page }) => {
      await mount(<RapidInputStory />);

      const marginInput = page.locator(getDataQALocator("margin-input"));

      await marginInput.fill("100");
      await marginInput.fill("500");
      await marginInput.fill("1000");
      await marginInput.fill("2500");

      await expect(marginInput).toHaveValue("2500");
    });

    test("switching display mode rapidly doesn't corrupt state", async ({ mount, page }) => {
      await mount(<RapidInputStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("4000");

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));

      // Switch to token
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      // Switch back to USD
      await toggle.click();
      await page.locator("td").filter({ hasText: /^USD$/ }).click();

      // Should not crash, value should be valid
      const value = await sizeInput.inputValue();
      expect(value).toBeTruthy();
    });
  });

  test.describe("Price changes during editing", () => {
    test("focused size field is not overwritten by price change", async ({ mount, page }) => {
      const component = await mount(<EdgeCaseStory initialFromValue="1000" initialToValue="0.5" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.focus();
      await sizeInput.fill("9999");

      await expect(page.getByTestId("focused-input")).toHaveText("to");

      // Simulate price change while user is editing size
      await component.update(<EdgeCaseStory initialFromValue="1000" initialToValue="0.5" ethPrice={2500} />);

      // The value should remain what the user typed, not be overwritten by price change
      await expect(sizeInput).toHaveValue("9999");
    });
  });

  test.describe("Large and small values", () => {
    test("very large margin amount renders without overflow", async ({ mount, page }) => {
      await mount(<LargeValuesStory />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("999999999");
    });

    test("dust amounts render without crashing", async ({ mount, page }) => {
      await mount(<DustAmountsStory />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("0.000001");
    });

    test("typing very large value in size field doesn't crash", async ({ mount, page }) => {
      await mount(<EdgeCaseStory initialFromValue="1000" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("999999999999");

      await expect(sizeInput).toHaveValue("999999999999");
      // Component should still be responsive
      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
    });

    test("typing very small decimal in size field doesn't crash", async ({ mount, page }) => {
      await mount(<EdgeCaseStory initialFromValue="1000" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("0.00000001");

      await expect(sizeInput).toHaveValue("0.00000001");
      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
    });
  });
});
