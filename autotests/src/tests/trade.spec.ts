import { expect } from "@playwright/test";
import { test } from "../base";

test.describe.serial("Trades", () => {
  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test.describe("Market", () => {
    test("increase market position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");
      await gmx.tradebox.selectMode("Market");

      await gmx.tradebox.selectMarket("WBTC/USD");
      await gmx.tradebox.selectCollateral("AVAX");

      await gmx.tradebox.selectPool("WBTC-USDC");
      await gmx.tradebox.selectCollateralIn("USDC");

      await gmx.tradebox.payInput.fill("0.1");
      await gmx.tradebox.setLeverage("2x");

      expect(gmx.tradebox.confirmTradeButton).toBeEnabled();

      await gmx.tradebox.confirmTradeButton.click();
      await gmx.wallet.confirmTransaction();
      await gmx.page.waitForTimeout(1000);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");
      const isPositionPresent = await gmx.has(position.root);

      expect(isPositionPresent).toBeTruthy();
    });

    test("edit position deposit", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");
      position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.deposit("2");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("edit position withdraw 25%", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");
      position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.withdraw("25%");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("close position partially", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");
      position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.closePartially("25%");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("close position full", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");
      position.root.waitForVisible();

      expect(position.root).toBeVisible();
      await position.closeFull();

      await position.root.waitForDetached();
      expect(position.root).not.toBeAttached();
    });
  });

  test.describe.skip("Limit", () => {
    test("create limit position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");
      await gmx.tradebox.selectMode("Limit");

      await gmx.tradebox.selectMarket("BTC/USD");
      await gmx.tradebox.selectCollateral("AVAX");

      await gmx.tradebox.selectPool("WBTC-USDC");
      await gmx.tradebox.selectCollateralIn("USDC");

      await gmx.tradebox.payInput.fill("0.1");
      await gmx.tradebox.setLeverage("2x");

      const price = await gmx.header.getPrice();

      const limitPrice = Number(price.replace(/[\$,]/g, "")) * 0.9;

      await gmx.tradebox.triggerPriceInput.fill(limitPrice.toString());

      expect(gmx.tradebox.confirmTradeButton).toBeEnabled();

      await gmx.tradebox.confirmTradeButton.click();
      await gmx.wallet.confirmTransaction();

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      await position.root.waitForSelector();
      expect(position.root).toBeAttached();
    });
  });
});
