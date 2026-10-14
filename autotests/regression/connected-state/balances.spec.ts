import { expect } from "@playwright/test";
import { zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { inputNumber, openSettings, selectMarket, selectTradeDirection } from "../fixtures/trade";
import { configureClassicTrading } from "../fixtures/tradingForms";

test.beforeEach(async ({ accountState }) => {
  accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
});

for (const direction of ["Long", "Short"] as const) {
  test(`5.11 5.14 22.25 ${direction} uses the mocked wallet balance and blocks overspending`, async ({
    page,
    accountState,
  }) => {
    await accountState.connect(page);
    const settings = await openSettings(page);
    await settings.getByText("Classic", { exact: true }).click();
    await page.keyboard.press("Escape");
    await selectMarket(page, "ETH");
    await selectTradeDirection(page, direction);
    await expect(page.getByTestId("margin").getByRole("button", { name: "1,000.00", exact: true })).toBeVisible();
    const margin = page.getByTestId("margin-input");
    await margin.fill("2000");
    await expect(page.getByTestId("confirm-trade-button")).toHaveText(/Insufficient .*balance/);
    await expect(page.getByTestId("confirm-trade-button")).toBeDisabled();
    await page.getByTestId("margin").getByRole("button", { name: "1,000.00", exact: true }).click();
    await expect.poll(() => inputNumber(margin)).toBe(1000);
    await margin.fill("100");
    await expect(page.getByTestId("confirm-trade-button")).toBeEnabled();
    await expect(page.getByTestId("confirm-trade-button")).not.toHaveText(/Insufficient|Connect wallet|Loading/);
    await expect.poll(() => inputNumber(page.getByTestId("position-size-input"))).toBeGreaterThan(180);
    await accountState.refresh(page);
    await expect(page.getByTestId("margin").getByRole("button", { name: "1,000.00", exact: true })).toBeVisible();
  });
}

test("22.25 mocked swap balance blocks excessive input and recovers after correction", async ({
  page,
  accountState,
}) => {
  await accountState.connect(page, "/trade/swap?mode=market&from=USDC&to=ETH");
  await page.getByTestId("pay-input").fill("2000");
  await expect(page.getByTestId("confirm-trade-button")).toHaveText(/Insufficient .*balance/);
  await expect(page.getByTestId("confirm-trade-button")).toBeDisabled();
  await page.getByTestId("pay-input").fill("100");
  await expect(page.getByTestId("confirm-trade-button")).toBeEnabled();
  await expect.poll(() => inputNumber(page.getByTestId("swap-receive-input"))).toBeGreaterThan(0);
});

test("11.04 Classic swap Max uses the available mocked USDC balance", async ({ page, accountState }) => {
  await accountState.connect(page, "/trade/swap?mode=market&from=USDC&to=ETH");
  await expect(page.getByTestId("pay")).toContainText("1,000.00");
  const settings = await openSettings(page);
  await settings.getByText("Classic", { exact: true }).click();
  await page.keyboard.press("Escape");
  const pay = page.getByTestId("pay");
  await pay.getByRole("button", { name: "Max", exact: true }).click();
  await expect.poll(() => inputNumber(page.getByTestId("pay-input"))).toBe(1000);
  await expect.poll(() => inputNumber(page.getByTestId("swap-receive-input"))).toBeGreaterThan(0);
});

test("11.04 Express swap Max reserves fees from the mocked USDC balance", async ({ page, accountState }) => {
  await accountState.connect(page, "/trade/swap?mode=market&from=USDC&to=ETH");
  const settings = await openSettings(page);
  await settings.getByText("Express", { exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByTestId("pay").getByRole("button", { name: "Max", exact: true }).click();
  const input = page.getByTestId("pay-input");
  await expect.poll(() => inputNumber(input)).toBeGreaterThan(990);
  await expect.poll(() => inputNumber(input)).toBeLessThan(1000);
  await expect(page.getByTestId("confirm-trade-button")).toBeEnabled();
});

test("8.09 Classic withdraw editor blocks withdrawing more than position collateral", async ({
  page,
  accountState,
}) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  await configureClassicTrading(page);
  await page.getByTestId("trade-table-large").getByTestId("position-edit-button").click();
  const modal = page.getByTestId("position-edit-modal");
  await modal.getByTestId("operation-tabs").getByRole("button", { name: "Withdraw", exact: true }).click();
  await modal.getByTestId("amount-input-input").fill("300");
  await expect(modal.getByTestId("confirm-button")).toBeDisabled();
  await expect(modal).toContainText(/collateral|margin/i);
  await modal.getByTestId("amount-input-input").fill("10");
  await expect(modal.getByTestId("confirm-button")).toBeEnabled();
});
