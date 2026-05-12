import { test, expect } from "@playwright/experimental-ct-react";

import { getDataQALocator } from "lib/__tests__/testUtils";
import { TradeMode } from "sdk/utils/trade/types";

import { TradeboxMarginFieldsStory } from "./TradeboxMarginFields.ct.stories";

test.describe("TradeboxMarginFields", () => {
  test.describe("Rendering", () => {
    test("renders margin field, size field, and percentage slider", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      await expect(page.locator(getDataQALocator("margin"))).toBeVisible();
      await expect(page.locator(getDataQALocator("position-size"))).toBeVisible();

      // Slider percentage marks
      for (const mark of ["0%", "25%", "50%", "75%", "100%"]) {
        await expect(page.getByText(mark).first()).toBeVisible();
      }
    });

    test("shows initial margin value", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialFromValue="500" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await expect(marginInput).toHaveValue("500");
    });

    test("margin input has placeholder 0.00", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialFromValue="" />);

      await expect(page.locator(getDataQALocator("margin-input"))).toBeVisible();
    });

    test("size input has placeholder 0.0", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialToValue="" />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await expect(sizeInput).toHaveAttribute("placeholder", "0.0");
    });
  });

  test.describe("Price Field visibility", () => {
    test("does NOT render price field for market orders", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Market} />);

      await expect(page.locator(getDataQALocator("trigger-price"))).not.toBeVisible();
    });

    test("renders price field for limit orders", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="2000" />);

      await expect(page.getByText("Limit price")).toBeVisible();
      await expect(page.locator(getDataQALocator("trigger-price-input"))).toBeVisible();
    });

    test("does NOT render price field when triggerPriceInputValue is undefined", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Market} />);

      await expect(page.locator(getDataQALocator("trigger-price"))).toHaveCount(0);
    });
  });

  test.describe("Margin Input", () => {
    test("typing updates the margin value", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialFromValue="" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("500");
      await expect(marginInput).toHaveValue("500");
    });

    test("accepts decimal values", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialFromValue="" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("123.45");
      await expect(marginInput).toHaveValue("123.45");
    });

    test("clearing margin sets value to empty", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory initialFromValue="1000" />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      await marginInput.fill("");
      await expect(marginInput).toHaveValue("");
    });
  });

  test.describe("Size Input", () => {
    test("typing in size field updates the value", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("5000");
      await expect(sizeInput).toHaveValue("5000");
    });

    test("accepts decimal values in size field", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      const sizeInput = page.locator(getDataQALocator("position-size-input"));
      await sizeInput.fill("1234.56");
      await expect(sizeInput).toHaveValue("1234.56");
    });

    test("display mode initially shows USD", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await expect(toggle).toContainText("USD");
    });

    test("display mode toggle switches to token symbol", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));
      await toggle.click();

      // Select ETH (token mode) from the dropdown
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();

      await expect(toggle).toContainText("ETH");
    });

    test("display mode toggle switches back to USD", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      const toggle = page.locator(getDataQALocator("position-size-display-mode-button"));

      // Switch to token mode
      await toggle.click();
      await page.locator("td").filter({ hasText: /^ETH$/ }).click();
      await expect(toggle).toContainText("ETH");

      // Switch back to USD
      await toggle.click();
      await page.locator("td").filter({ hasText: /^USD$/ }).click();
      await expect(toggle).toContainText("USD");
    });
  });

  test.describe("Price Field", () => {
    test("shows 'Limit price' label for Limit trade mode", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="" />);

      await expect(page.getByText("Limit price")).toBeVisible();
    });

    test("typing in price field updates the value", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="" />);

      const priceInput = page.locator(getDataQALocator("trigger-price-input"));
      await priceInput.fill("1950");
      await expect(priceInput).toHaveValue("1950");
    });

    test("shows USD unit label", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="2000" />);

      const priceField = page.locator(getDataQALocator("trigger-price"));
      await expect(priceField.getByText("USD")).toBeVisible();
    });

    test("clicking mark price fills trigger price input", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="" />);

      await page.getByText("Mark:").click();

      const priceInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(priceInput).toHaveValue("2000");
    });

    test("shows initial trigger price value", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.Limit} initialTriggerPrice="1850" />);

      const priceInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(priceInput).toHaveValue("1850");
    });
  });

  test.describe("StopMarket trade mode", () => {
    test("renders price field for StopMarket orders (isLimit is true)", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.StopMarket} initialTriggerPrice="1900" />);

      await expect(page.locator(getDataQALocator("trigger-price"))).toBeVisible();
      await expect(page.locator(getDataQALocator("trigger-price-input"))).toBeVisible();
    });

    test("StopMarket shows trigger price input value when set", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory tradeMode={TradeMode.StopMarket} initialTriggerPrice="1850" />);

      const priceInput = page.locator(getDataQALocator("trigger-price-input"));
      await expect(priceInput).toHaveValue("1850");
    });
  });

  test.describe("Percentage Slider", () => {
    test("renders all percentage marks", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      for (const mark of ["0%", "25%", "50%", "75%", "100%"]) {
        await expect(page.getByText(mark).first()).toBeVisible();
      }
    });

    test("slider is interactive", async ({ mount, page }) => {
      await mount(<TradeboxMarginFieldsStory />);

      await expect(page.locator(".rc-slider")).toBeVisible();
      await expect(page.locator(".rc-slider-handle")).toBeVisible();
    });
  });
});
