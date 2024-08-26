import { expect } from "@playwright/test";
import { test } from "../base";

/**
 * Increased to 30 seconds because of the slow performance on fuji
 */
const POSITION_CHANGE_TIMEOUT = 30_000; // 30 seconds;
const isFuji = process.env.CHAIN === "fuji";

test.describe.serial("Trades", () => {
  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test.describe.skip("Market", () => {
    const TEST_CONFIG = isFuji
      ? {
          direction: "Long" as const,
          market: "WBTC/USD",
          collateral: "AVAX",
          pool: "WBTC-USDC",
          collateralIn: "USDC",
          pay: "0.1",
        }
      : {
          direction: "Long" as const,
          market: "WETH/USD",
          collateral: "ETH",
          pool: "WETH-USDC",
          collateralIn: "USDC",
          pay: "0.001",
        };

    test("increase market position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");
      await gmx.tradebox.selectMode("Market");

      await gmx.tradebox.selectMarket(TEST_CONFIG.market);
      await gmx.tradebox.selectCollateral(TEST_CONFIG.collateral);

      await gmx.tradebox.selectPool(TEST_CONFIG.pool);
      await gmx.tradebox.selectCollateralIn(TEST_CONFIG.collateralIn);

      await gmx.tradebox.payInput.fill(TEST_CONFIG.pay);
      await gmx.tradebox.setLeverage("2x");

      expect(gmx.tradebox.confirmTradeButton).toBeEnabled();

      await gmx.tradebox.confirmTradeButton.click();
      await gmx.wallet.confirmTransaction();

      const position = await gmx.getPosition(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      const isPositionPresent = await gmx.has(position.root, POSITION_CHANGE_TIMEOUT);

      expect(isPositionPresent).toBeTruthy();
    });

    test("edit position deposit", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      await position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.deposit("2");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("edit position withdraw 25%", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      await position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.withdraw("25%");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("close position partially", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      await position.root.waitForVisible();

      expect(position.root).toBeVisible();
      const collateral = await position.getCollateral();

      await position.closePartially("25%");

      const newCollateral = await position.getCollateral();
      expect(newCollateral !== collateral).toBeTruthy();
    });

    test("close position full", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const position = await gmx.getPosition(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      await position.root.waitForVisible();

      expect(position.root).toBeVisible();
      await position.closeFull();

      await position.root.waitForDetached();
      expect(position.root).not.toBeAttached();
    });
  });

  test.describe("Limit", () => {
    const TEST_CONFIG = isFuji
      ? {
          direction: "Long" as const,
          market: "WBTC/USD",
          collateral: "AVAX",
          pool: "WBTC-USDC",
          collateralIn: "USDC",
          limitRatio: 0.9,
          pay: "0.1",
        }
      : {
          direction: "Long" as const,
          market: "WETH/USD",
          collateral: "ETH",
          pool: "WETH-USDC",
          collateralIn: "USDC",
          limitRatio: 0.9,
          pay: "0.001",
        };

    test("create limit position", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      await gmx.tradebox.selectDirection("Long");

      await gmx.tradebox.selectMarket(TEST_CONFIG.market);
      await gmx.tradebox.selectCollateral(TEST_CONFIG.collateral);

      await gmx.tradebox.selectPool(TEST_CONFIG.pool);
      await gmx.tradebox.selectCollateralIn(TEST_CONFIG.collateralIn);

      await gmx.tradebox.payInput.fill(TEST_CONFIG.pay);
      await gmx.tradebox.setLeverage("2x");

      await gmx.tradebox.selectMode("Limit");
      await gmx.tradebox.triggerPriceInput.waitForSelector();

      const price = await gmx.getPrice();

      const limitPrice = Number(price.replace(/[\$,]/g, "")) * TEST_CONFIG.limitRatio;

      await gmx.tradebox.triggerPriceInput.fill(limitPrice.toString());

      expect(gmx.tradebox.confirmTradeButton).toBeEnabled();

      await gmx.tradebox.confirmTradeButton.click();
      await gmx.wallet.confirmTransaction();

      const order = await gmx.getOrder(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      const isOrderPresent = await gmx.has(order.root, POSITION_CHANGE_TIMEOUT);
      expect(isOrderPresent).toBeTruthy();
    });

    test("close Limit order", async ({ page, gmx }) => {
      await page.goto(gmx.baseUrl);

      const order = await gmx.getOrder(TEST_CONFIG.market, TEST_CONFIG.pool, TEST_CONFIG.direction);
      await order.root.waitForVisible();

      await order.close();

      await order.root.waitForDetached();
      expect(order.root).not.toBeAttached();
    });
  });
});
