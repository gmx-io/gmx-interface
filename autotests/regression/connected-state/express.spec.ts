import { expect, type Locator } from "@playwright/test";
import { zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { openSettings } from "../fixtures/trade";

function tradingMode(settings: Locator, name: string) {
  return settings.getByText(name, { exact: true }).locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
}

const wrappedNative = (chainId: number) => (chainId === 42161 ? "WETH" : "WAVAX");

test("24.02 an empty account sees the Express out-of-gas banner and cannot pick Express or One-Click", async ({
  page,
  accountState,
  chainId,
}) => {
  await accountState.connect(page);
  const settings = await openSettings(page);
  await expect(settings).toContainText(
    `Insufficient USDC, ${wrappedNative(chainId)}, or USDT in your wallet. Express Trading and One-Click Trading are unavailable.`
  );
  await expect(settings.getByRole("link", { name: "Swap", exact: true })).toHaveAttribute(
    "href",
    /\/trade\/swap\?to=USDC$/
  );
  for (const name of ["Express", "Express + One-Click"]) {
    await expect(tradingMode(settings, name)).toHaveClass(/(?:^|\s)cursor-not-allowed(?:\s|$)/);
  }
  await expect(tradingMode(settings, "Classic")).toHaveClass(/(?:^|\s)cursor-pointer(?:\s|$)/);
});

test.describe("funded wallet", () => {
  test.beforeEach(async ({ accountState }) => {
    accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
    accountState.balances.set(zeroAddress, 10n ** 17n);
  });

  test("14.06 a funded account has no out-of-gas banner and can choose Express + One-Click", async ({
    page,
    accountState,
  }) => {
    await accountState.connect(page);
    const settings = await openSettings(page);
    await expect(settings.getByText("One-Click settings", { exact: true })).toBeVisible();
    await expect(settings.getByText(/Express Trading and One-Click Trading are unavailable/)).toHaveCount(0);
    for (const name of ["Express", "Express + One-Click"]) {
      await expect(tradingMode(settings, name)).toHaveClass(/(?:^|\s)cursor-pointer(?:\s|$)/);
    }
  });

  test("14.02 14.03 Express network fee is charged in the USDC gas payment token with a sane USD value (relay and execution fees are shown combined)", async ({
    page,
    accountState,
  }) => {
    await accountState.connect(page);
    await page.getByTestId("margin-input").fill("10");
    await page.getByTestId("position-size-input").fill("20");
    await page.getByText("Execution details", { exact: true }).click();
    const row = page
      .getByText("Network fee", { exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
    await expect(row).toContainText(/-[\d.]+\s*USDC\s*\(-\$\s*[\d.]+\)/);
    await expect(row.getByRole("img", { name: "Wallet", exact: true })).toBeVisible();
    const [usdc, usd] = [...(await row.innerText()).matchAll(/-\$?\s*([\d.]+)/g)].map((match) => Number(match[1]));
    expect(usd).toBeGreaterThan(0.001);
    expect(usd).toBeLessThan(5);
    expect(Math.abs(usdc - usd)).toBeLessThanOrEqual(Math.max(0.01, usd * 0.05));
    await row.locator(".Tooltip-handle").last().hover();
    const tooltip = page.locator(".Tooltip-popup");
    await expect(tooltip).toContainText(/Paid from:?\s*Wallet/);
    await expect(tooltip).toContainText(/Max network fee:?\s*-[\d.]+\s*USDC/);
    await expect(tooltip).toContainText("Estimated fee refund");
    await expect(tooltip).toContainText("Express fees are paid in your Wallet gas payment token.");
    const [maxFee] = [...(await tooltip.innerText()).matchAll(/Max network fee:?\s*-([\d.]+)/g)].map((match) =>
      Number(match[1])
    );
    expect(maxFee).toBeGreaterThanOrEqual(usdc);
  });
});
