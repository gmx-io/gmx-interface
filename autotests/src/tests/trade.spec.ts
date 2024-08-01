import { expect } from "@playwright/test";
import { test } from "../base";
import get from "lodash/get";

test.describe.serial("Trades", () => {
  test.describe("Market", () => {
    test("increase market position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");
      await gmx.tradebox.selectMode("Market");

      await gmx.tradebox.selectMarket("BNB/USD");
      await gmx.tradebox.selectCollateral("AVAX");

      await gmx.tradebox.selectPool("WBTC-USDC");
      await gmx.tradebox.selectCollateralIn("USDC");

      await gmx.tradebox.payInput.fill("0.1");
      await gmx.tradebox.setLeverage("2x");

      expect(gmx.tradebox.confirmTradeButton).toBeEnabled();

      await gmx.tradebox.confirmTradeButton.click();
      await gmx.wallet.confirmTransaction();

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      await position.root.waitForSelector();
      expect(position.root).toBeVisible();
    });

    test("edit position deposit", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.deposit("1");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("edit position withdraw 25%", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.withdraw("25%");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("close position partially", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      expect(position.root).toBeVisible();
      await position.closePartially("25%");
    });

    test("close position full", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition("WBTC/USD", "WBTC-USDC", "Long");

      expect(position.root).toBeVisible();
      await position.closeFull();
    });
  });

  test.describe("Limit", () => {
    test("create limit position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");
      await gmx.tradebox.selectMode("Limit");

      await gmx.tradebox.selectMarket("BNB/USD");
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
      expect(position.root).toBeVisible();
    });
  });
});
