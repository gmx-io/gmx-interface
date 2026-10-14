import { expect } from "@playwright/test";
import { stringToHex } from "viem";

import { displayedNumber } from "../fixtures/displayedNumber";
import { test } from "../fixtures/landing";

test("2.33 2.37 landing shows the headline and positive headline metrics within 5 seconds", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".text-heading-1").filter({ hasText: "from your wallet" })).toBeVisible();
  for (const name of ["Traders", "Open interest", "Total volume"]) {
    const metric = page.getByText(name, { exact: true }).locator("..");
    await expect
      .poll(async () => displayedNumber((await metric.innerText()).replace(name, "")), { timeout: 5_000 })
      .toBeGreaterThan(0);
  }
});

for (const width of [390, 768, 1440, 1920, 2560]) {
  test(`0.15 2.36 landing has no horizontal page overflow at ${width}px and saves a baseline screenshot`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".text-heading-1").filter({ hasText: "from your wallet" })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.getByRole("heading", { name: "FAQ", exact: true }).scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await testInfo.attach(`landing-${width}px.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
}

for (const { path, heading } of [
  { path: "/builders", heading: /Build on GMX.*Get paid on every trade/ },
  { path: "/trader-affiliate-program", heading: /Trade more, pay less.*Refer, and earn/ },
]) {
  for (const hash of [false, true]) {
    test(`2.45 24.07 ${hash ? "hash" : "direct"} landing route ${path} renders its own content`, async ({ page }) => {
      await page.goto(`${hash ? "/#" : ""}${path}`);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.locator(".text-heading-1").filter({ hasText: "from your wallet" })).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    });
  }
}

test("2.44 VIP and Builders header links navigate to their pages", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("[data-landing-header]");
  await header.getByRole("link", { name: "Builders", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Build on GMX/ })).toBeVisible();
  await page.goBack();
  await header.getByRole("link", { name: "VIP", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Trade more, pay less/ })).toBeVisible();
});

test("2.45 builder revenue calculator updates monthly and yearly estimates", async ({ page }) => {
  await page.goto("/builders");
  await page.getByRole("button", { name: "$100m", exact: true }).click();
  await expect(page.getByText("≈ $87,500", { exact: true })).toBeVisible();
  await expect(page.getByText(/\$1\.05M.*year/)).toBeVisible();
  await page.getByRole("button", { name: "$1b", exact: true }).click();
  await expect(page.getByText("≈ $875,000", { exact: true })).toBeVisible();
  await expect(page.getByText(/\$10\.5M.*year/)).toBeVisible();
});

test("2.45 VIP calculator retains separate trader and affiliate volume selections", async ({ page }) => {
  await page.goto("/trader-affiliate-program");
  await page.getByRole("button", { name: "$100m", exact: true }).click();
  await expect(page.getByText("$12,500.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "I'm an affiliate", exact: true }).click();
  await expect(page.getByText("Estimate your income", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "$25m", exact: true }).click();
  await expect(page.getByText("$3,125.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "I'm a trader", exact: true }).click();
  await expect(page.getByText("$12,500.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lock in this rate", exact: true }).click();
  await expect(page.locator("#contact")).toBeInViewport();
});

test("2.47 landing FAQ opens and closes the selected answer", async ({ page }) => {
  await page.goto("/");
  const question = page.getByRole("heading", { name: "How do I get started on GMX?", exact: true });
  const answer = page.getByText(/No KYC, no lengthy onboarding/);
  await question.click();
  await expect(answer).toBeVisible();
  await expect(answer.locator("..")).toHaveCSS("opacity", "1");
  await question.click();
  await expect(answer.locator("..")).toHaveCSS("opacity", "0");
});

for (const { chain, id } of [
  { chain: "Arbitrum", id: 42161 },
  { chain: "Avalanche", id: 43114 },
  { chain: "MegaETH", id: 4326 },
  { chain: "Base", id: 8453 },
  { chain: "BNB", id: 56 },
  { chain: "Ethereum", id: 1 },
]) {
  test(`2.40 ${chain} landing button opens the app with the intended chain`, async ({ page }) => {
    await page.goto("/");
    const navigation = page.waitForURL(
      (url) => url.pathname === "/trade" && url.searchParams.get("chainId") === String(id),
      { waitUntil: "commit" }
    );
    await page.getByRole("button", { name: chain, exact: true }).click();
    await navigation;
    await expect(page.getByTestId("tradebox")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).first()).toBeVisible();
  });
}

test("2.40 Solana opens the GMTrade domain dialog", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Solana", exact: true }).click();
  await expect(
    page.getByText("GMX on Solana (GMTrade) is currently served from a separate domain", { exact: true })
  ).toBeVisible();
  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open GMTrade", exact: true }).click();
  const popup = await opened;
  await expect(popup).toHaveURL(/^https:\/\/gmtrade\.xyz\/?$/);
  await popup.close();
});

for (const index of [0, 1, 2, 3]) {
  test(`2.39 landing Open app or Trade now button ${index + 1} opens the app trade page`, async ({ page }) => {
    await page.goto("/");
    const buttons = page.getByRole("button", { name: /^(Open app|Trade now)$/ });
    await expect(buttons).toHaveCount(4);
    await buttons.nth(index).click();
    await expect(page).toHaveURL(/\/trade\?/);
    await expect(page.getByTestId("tradebox")).toBeVisible();
  });
}

test("2.47 social posts scroll and each card opens a different post", async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = [];
    Object.assign(window, { __openedPosts: opened, open: (url: string) => opened.push(url) && null });
  });
  await page.goto("/");
  await page.getByRole("heading", { name: /Driven by\s+our community/ }).scrollIntoViewIfNeeded();
  const slider = page.locator(".animate-scroll");
  const transform = () => slider.evaluate((element) => getComputedStyle(element).transform);
  const initial = await transform();
  await expect.poll(transform).not.toBe(initial);
  const cards = slider.locator(":scope > div.cursor-pointer");
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  // The slider never stops moving, so dispatch the click instead of waiting for a stable target.
  for (let index = 0; index < count; index++) await cards.nth(index).dispatchEvent("click");
  const posts = await page.evaluate(() => (window as unknown as { __openedPosts: string[] }).__openedPosts);
  expect(posts).toHaveLength(count);
  const byUsername = new Map<string, string>();
  for (let index = 0; index < count; index++) {
    const username = (await cards.nth(index).getByText(/^@/).first().innerText()).slice(1);
    byUsername.set(username, new URL(posts[index]).pathname.split("/").pop()!);
  }
  expect(new Set(byUsername.values()).size, JSON.stringify(Object.fromEntries(byUsername))).toBe(byUsername.size);
});

test("2.39 2.42 landing referral survives Trade now navigation into the app", async ({ page }) => {
  await page.goto("/?ref=regression");
  await page.getByRole("button", { name: "Trade now", exact: true }).first().click();
  await expect(page.getByTestId("tradebox")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("GMX-referralCode")))
    .toBe(stringToHex("regression", { size: 32 }));
});
