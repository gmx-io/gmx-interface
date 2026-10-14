import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { connectInjectedWallet } from "../fixtures/injectedWallet";

const chainName = (chainId: number) => (chainId === 42161 ? "Arbitrum" : "Avalanche");
const otherChain = (chainId: number) => (chainId === 42161 ? 43114 : 42161);
const POLYGON = 137;

function walletChainId(page: Page) {
  return page.evaluate(() => Number((window as unknown as { ethereum: { chainId: string } }).ethereum.chainId));
}

test.describe("wallet on the other settlement chain", () => {
  test.use({ walletChainId: async ({ chainId }, use) => use(otherChain(chainId)) });

  test("3.07 network badge shows the chain the wallet connects on", async ({ page, accountState, chainId }) => {
    const walletChain = chainName(otherChain(chainId));
    await page.goto("/trade", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("banner").getByRole("button", { name: chainName(chainId), exact: true })).toBeVisible();
    await connectInjectedWallet(page, accountState.address);
    const badge = page.getByRole("banner").getByRole("button", { name: walletChain, exact: true });
    await expect(badge).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: chainName(chainId), exact: true })).toHaveCount(
      0
    );
    expect(await walletChainId(page)).toBe(otherChain(chainId));
    await badge.click();
    await expect(
      page.getByTestId(`networks-dropdown-${walletChain}`).locator(".network-dropdown-item-label")
    ).toHaveClass(/text-typography-primary/);
    await expect(
      page.getByTestId(`networks-dropdown-${chainName(chainId)}`).locator(".network-dropdown-item-label")
    ).toHaveClass(/text-typography-secondary/);
  });
});

test.describe("wallet on an unsupported chain", () => {
  test.use({ walletChainId: POLYGON });

  test("3.10 connecting on an unsupported chain shows a switch prompt that recovers the connection", async ({
    page,
    accountState,
    chainId,
  }) => {
    accountState.rejectChainSwitch = true;
    await accountState.connect(page);
    const prompt = page.getByRole("alert").filter({ hasText: `Wallet not connected to ${chainName(chainId)}` });
    await expect(prompt).toBeVisible();
    expect(await walletChainId(page)).toBe(POLYGON);
    await expect(page.getByRole("banner").getByRole("button", { name: chainName(chainId), exact: true })).toBeVisible();
    await expect(page.getByTestId("confirm-trade-button")).toBeVisible();

    accountState.rejectChainSwitch = false;
    await prompt.getByText(`Switch to ${chainName(chainId)}`, { exact: true }).click();
    await expect.poll(() => walletChainId(page)).toBe(chainId);
    await expect(prompt).toBeHidden();
    await expect(page.getByTestId("user-address")).toContainText(accountState.address.slice(0, 6));
  });
});
