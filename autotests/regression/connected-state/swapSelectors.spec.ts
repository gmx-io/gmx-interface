import { expect } from "@playwright/test";
import { zeroAddress } from "viem";

import { getToken } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/accountState";

test("11.01 pay token selector lists wallet tokens with funded ones first, filters by search, recovers and selects", async ({
  page,
  accountState,
  chainId,
}) => {
  const usdc = accountState.data.collateral;
  accountState.balances.set(usdc.address, 10_000n * 10n ** 6n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  await accountState.connect(page, "/trade/swap?mode=market&from=USDC&to=ETH");
  await page.getByTestId("collateral-selector").click();
  const modal = page.getByTestId("collateral-selector-modal");
  const tokens = modal.locator('[data-qa^="available-token-"]');
  await expect(tokens.nth(3)).toBeVisible();
  // Tokens are ordered by wallet value: 10,000 USDC, then 1 ETH/AVAX, then unfunded tokens.
  await expect(tokens.first()).toHaveAttribute("data-qa", `available-token-${usdc.address}-${chainId}`);
  await expect(tokens.first()).toContainText("10,000");
  await expect(tokens.nth(1)).toHaveAttribute("data-qa", `available-token-${zeroAddress}-${chainId}`);
  await expect(tokens.nth(2)).toContainText("-");
  const total = await tokens.count();
  const search = modal.getByPlaceholder("Search", { exact: true });
  await search.fill("eth");
  await expect(tokens.first()).toBeVisible();
  const shown = await tokens.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-qa")!.split("-")[2])
  );
  expect(shown.length).toBeLessThan(total);
  for (const address of shown) {
    const token = getToken(chainId, address);
    expect([token.name, token.symbol, ...(token.searchAliases ?? [])].join(" ").toLowerCase(), address).toContain(
      "eth"
    );
  }
  await search.fill("regression-no-such-token");
  await expect(tokens).toHaveCount(0);
  await search.clear();
  await expect(tokens).toHaveCount(total);
  const native = chainId === 42161 ? "ETH" : "AVAX";
  await search.fill(native.toLowerCase());
  await modal.getByTestId(`available-token-${zeroAddress}-${chainId}`).click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("collateral-selector")).toContainText(native);
  await expect(page.getByTestId("pay")).toContainText("1.0000");
});
