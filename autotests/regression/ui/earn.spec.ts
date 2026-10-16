import { expect } from "@playwright/test";

import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/browser";

test("13.01 13.13 Discover cards open the GMX buy modal with this chain's GMX venues and the GM/GLV pool list", async ({
  page,
  chainId,
}) => {
  await page.goto("/earn/discover");
  for (const token of ["GMX", "GM", "GLV"]) {
    await expect(page.getByRole("heading", { name: `What is ${token}?`, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Buy GMX", exact: true }).click();
  await expect(page.getByText("Buy on other platforms", { exact: true })).toBeVisible();
  const gmx = getTokenBySymbol(chainId, "GMX").address;
  const network = chainId === 42161 ? "arbitrum" : "avalanche";
  for (const [venue, href] of [
    [
      "Uniswap",
      chainId === 42161
        ? `https://app.uniswap.org/swap?chain=arbitrum&inputCurrency=ETH&outputCurrency=${gmx}`
        : "https://app.uniswap.org/",
    ],
    ["1inch", `https://1inch.com/swap?src=${chainId}:${chainId === 42161 ? "ETH" : "AVAX"}&dst=${chainId}:GMX`],
    ["Matcha", `https://www.matcha.xyz/markets/${chainId}/${gmx}`],
    ["Binance", "https://www.binance.com/en/trade/GMX_USDT"],
    ["Bybit", "https://www.bybit.com/en-US/trade/spot/GMX/USDT"],
    ["Banxa", `https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=${network}`],
  ]) {
    const link = page.getByRole("link", { name: venue, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await page.getByRole("button", { name: "Buy GMX on GMX swap", exact: true }).click();
  await expect(page).toHaveURL(/\/trade\/swap/);
  await expect(page.getByTestId("receive-selector")).toContainText("GMX");
  await page.goBack();
  await page.getByRole("button", { name: "Buy GMX", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Buy on other platforms", { exact: true })).toBeHidden();
  for (const token of ["GM", "GLV"]) {
    await page.getByRole("link", { name: `Buy ${token}`, exact: true }).click();
    await expect(page).toHaveURL(/\/pools$/);
    await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
    await page.goBack();
  }
});

test("13.07 opportunity category shows exactly the cards tagged with it, survives reload and search recovers", async ({
  page,
}) => {
  await page.goto("/earn/additional_opportunities/all");
  const names = page.getByRole("heading", { level: 3 });
  await expect(names.first()).toBeVisible();
  const category = "Lending and borrowing";
  // Each card's header row lists its category badges.
  const tagged = await names.evaluateAll(
    (headings, label) =>
      headings.flatMap((heading) => {
        let card = heading.parentElement;
        while (card && !card.querySelector("img")) card = card.parentElement;
        const tags = (card?.firstElementChild as HTMLElement | null)?.innerText.split("\n") ?? [];
        return tags.includes(label) ? [heading.textContent!.trim()] : [];
      }),
    category
  );
  expect(tagged.length).toBeGreaterThan(0);
  expect(tagged.length).toBeLessThan(await names.count());
  await page.getByRole("button", { name: category, exact: true }).click();
  await expect(page).toHaveURL(/additional_opportunities\/lending-and-borrowing$/);
  await expect(names).toHaveText(tagged);
  await page.reload();
  await expect(page).toHaveURL(/additional_opportunities\/lending-and-borrowing$/);
  await expect(names).toHaveText(tagged);
  const search = page.getByPlaceholder("Search opportunities", { exact: true });
  await search.fill("regression-no-such-opportunity");
  await expect(page.getByText("No opportunities match your search", { exact: true })).toBeVisible();
  await search.fill("");
  await expect(page.getByText("No opportunities match your search", { exact: true })).toBeHidden();
  await expect(names).toHaveText(tagged);
});

test("Earn FAQ opens, switches answers and closes", async ({ page }) => {
  await page.goto("/earn/discover");
  const first = page.getByRole("button", { name: "Where do GMX staking rewards come from?", exact: true });
  const second = page.getByRole("button", { name: "What's the difference between GLV and GM?", exact: true });
  await first.click();
  await expect(page.getByText(/27% of protocol revenue is used to buy back GMX/)).toBeVisible();
  await second.click();
  await expect(page.getByText(/27% of protocol revenue is used to buy back GMX/)).toBeHidden();
  const answer = page.getByText(/GM earns fees from one market/);
  await expect(answer).toBeVisible();
  await second.click();
  await expect(answer).toBeHidden();
});
