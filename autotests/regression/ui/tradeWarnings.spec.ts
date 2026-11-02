import { expect } from "@playwright/test";
import { test } from "../fixtures/browser";
import { openTrade, openSettings, selectMarket, selectTradeDirection, setSettingsToggle } from "../fixtures/trade";

for (const direction of ["Long", "Short"] as const) {
  test(`5.30 ${direction} large leveraged quote warns about impact before connecting a wallet`, async ({ page }) => {
    await openTrade(page);
    const settings = await openSettings(page, "Display");
    await setSettingsToggle(settings, "Manual leverage", false);
    await page.keyboard.press("Escape");
    await selectMarket(page, "ETH");
    await selectTradeDirection(page, direction);
    await page.getByTestId("margin-input").fill("10000");
    await page.getByTestId("position-size-input").fill("100000000");
    const warning = page.getByTestId("tradebox").getByText("High net price impact", { exact: true });
    await expect(warning).toBeVisible();
    await page.getByTestId("position-size-input").fill("20000");
    await expect(warning).toBeHidden();
    await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  });
}
