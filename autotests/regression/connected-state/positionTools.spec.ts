import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { fundedPositionRow } from "../fixtures/tradingForms";
import { displayedNumbers, infoRow, inputNumber, setSettingsToggle } from "../fixtures/trade";

const PRICE = 10n ** 12n;
const USD = 10n ** 30n;

test.use({ unsignedReviewMode: true });

async function openModal(page: Page, button: string, testId: string) {
  await fundedPositionRow(page, true).getByTestId(button).click();
  const modal = page.getByTestId(testId);
  await expect(modal.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' Modal ')][1]")).toHaveCSS(
    "opacity",
    "1"
  );
  return modal;
}

async function openPartialClose(page: Page) {
  const modal = await openModal(page, "position-close-button", "position-close-modal");
  await modal.getByTestId("amount-input-input").fill("500");
  await expect.poll(() => inputNumber(modal.getByTestId("amount-input-input"))).toBe(500);
  // The expanded state is remembered after the first open.
  const details = modal.getByText("Network fee", { exact: true });
  if (!(await details.count())) await modal.getByRole("button", { name: "Execution details", exact: true }).click();
  await expect(details).toBeVisible();
  return modal;
}

test("7.10 positions list TP/SL column shows the closest mocked TP and SL trigger prices", async ({
  page,
  accountState,
}) => {
  const { position, order } = accountState.data;
  accountState.positions = [position(true), position(false)];
  accountState.orders = [
    { ...order(5, true, 1), triggerPrice: 3200n * PRICE },
    { ...order(5, true, 2), triggerPrice: 3000n * PRICE },
    { ...order(6, true, 3), triggerPrice: 2100n * PRICE },
  ];
  await accountState.connect(page);
  const long = fundedPositionRow(page, true).getByRole("cell").nth(7);
  await expect(long).toContainText(/3,000\.00\s*\(2\)/);
  await expect(long).toContainText(/2,100\.00/);
  await expect(long).not.toContainText(/3,200/);
  await expect(long.getByRole("button", { name: "Set" })).toHaveCount(0);
  const short = fundedPositionRow(page, false).getByRole("cell").nth(7);
  await expect(short).toContainText(/—\s*—/);
  await expect(short.getByRole("button", { name: "Set" })).toBeVisible();
});

test("5.35 close destination selector switches the margin destination without changing size or receive amount", async ({
  page,
  accountState,
  chainId,
}) => {
  test.skip(chainId !== 42161, "The GMX Account destination selector exists only on Arbitrum");
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  // A choice made before the default destination is stored gets reset when it is stored.
  const destinationKey = JSON.stringify([chainId, accountState.address, "collateral-close-destination"]);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), destinationKey)).toBe("false");
  for (const keepDefault of [true, false]) {
    const modal = await openPartialClose(page);
    const fee = infoRow(modal, "Network fee");
    const receive = infoRow(modal, "Receive");
    await expect(fee.getByRole("img", { name: "Wallet", exact: true })).toBeVisible();
    await expect(receive).toContainText(/\d\sUSDC/);
    const amount = await displayedNumbers(receive);
    await receive.click();
    const selector = page.getByText("Send remaining margin to", { exact: true }).locator("xpath=..");
    await selector.getByText("Arbitrum wallet", { exact: true }).click();
    await page.getByText("GMX Account", { exact: true }).last().click();
    const dialog = page.locator(".Modal-content").filter({ hasText: "Update default destination" });
    await expect(dialog).toContainText("You chose to send the remaining margin to your GMX Account.");
    await dialog
      .getByRole("button", {
        name: keepDefault ? "No, keep Arbitrum wallet as default" : "Yes, set GMX Account as default",
        exact: true,
      })
      .click();
    await expect(dialog).toBeHidden();
    await expect(selector).toContainText("GMX Account");
    // Escape would close every open modal, including the close form.
    await page.locator(".Modal-content").filter({ has: selector }).locator(".Modal-close-button").click();
    await expect(selector).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(fee.getByRole("img", { name: "GMX Account", exact: true })).toBeVisible();
    await expect(modal.getByTestId("confirm-button")).toContainText("GMX Account");
    await expect(receive.locator("img[src*='ic_gmx']")).toBeVisible();
    await expect.poll(() => displayedNumbers(receive)).toEqual(amount);
    await expect.poll(() => inputNumber(modal.getByTestId("amount-input-input"))).toBe(500);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  }
  const modal = await openPartialClose(page);
  await expect(infoRow(modal, "Network fee").getByRole("img", { name: "GMX Account", exact: true })).toBeVisible();
});

test("5.36 partial: Keep leverage on a partial close holds leverage, off keeps margin; the margin editor has no toggle", async ({
  page,
  accountState,
}) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  const modal = await openPartialClose(page);
  const leverage = infoRow(modal, "Leverage");
  const margin = infoRow(modal, "Margin (USDC)");
  const receive = infoRow(modal, "Receive");
  await expect(modal.getByText("Keep leverage at 4.00x", { exact: true })).toBeVisible();
  await expect.poll(() => displayedNumbers(leverage)).toEqual([4]);
  await expect.poll(async () => (await displayedNumbers(margin))[1]).toBeGreaterThan(120);
  expect((await displayedNumbers(margin))[1]).toBeLessThan(130);
  expect((await displayedNumbers(receive))[0]).toBeGreaterThan(100);
  await setSettingsToggle(modal, "Keep leverage at 4.00x", false);
  await expect.poll(() => displayedNumbers(leverage)).toEqual([4, 2]);
  await expect.poll(() => displayedNumbers(margin)).toEqual([250]);
  await expect.poll(async () => (await displayedNumbers(receive))[0]).toBeLessThan(25);
  await expect.poll(() => inputNumber(modal.getByTestId("amount-input-input"))).toBe(500);
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();

  const editor = await openModal(page, "position-edit-button", "position-edit-modal");
  await editor.getByRole("button", { name: "Execution details", exact: true }).click();
  for (const [operation, amount, nextLeverage] of [
    ["Deposit", "250", 2],
    ["Withdraw", "125", 8],
  ] as const) {
    await editor.getByTestId("operation-tabs").getByRole("button", { name: operation, exact: true }).click();
    await editor.getByTestId("amount-input-input").fill(amount);
    await expect.poll(async () => (await displayedNumbers(infoRow(editor, "Leverage")))[0]).toBe(4);
    await expect
      .poll(async () => (await displayedNumbers(infoRow(editor, "Leverage")))[1])
      .toBeCloseTo(nextLeverage, 0);
    await expect(editor.getByText(/Keep leverage/)).toHaveCount(0);
  }
});

test("8.08 partial: position row re-renders API-updated mark and liquidation prices without reload", async ({
  page,
  accountState,
}) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  const row = fundedPositionRow(page, true);
  await expect(row.getByRole("cell").nth(5)).toContainText(/2,500\.00/);
  await expect(row.getByRole("cell").nth(6)).toContainText(/1,900\.00/);
  Object.assign(accountState.positions[0], { markPrice: 2300n * USD, liquidationPrice: 1950n * USD });
  await expect(row.getByRole("cell").nth(5)).toContainText(/2,300\.00/);
  await expect(row.getByRole("cell").nth(6)).toContainText(/1,950\.00/);
});

test("8.11 share position renders the card and builds the share link from a stubbed upload", async ({
  page,
  context,
  accountState,
}) => {
  const uploads: string[] = [];
  // Never publish: the image upload and the X intent are answered locally.
  await context.route(/\/api\/upload$/, async (route) => {
    uploads.push(route.request().url());
    await route.fulfill({ json: { id: "regression-share" } });
  });
  await context.route(/^https:\/\/(twitter|x)\.com\//, (route) => route.fulfill({ body: "" }));
  await context.addInitScript(() =>
    localStorage.setItem(JSON.stringify("is-create-referral-code-info-message-closed"), "true")
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  await fundedPositionRow(page, true).getByRole("cell").last().getByRole("button").last().click();
  await page.getByRole("menuitem", { name: "Share position" }).click();
  const modal = page.locator(".Modal-content").filter({ hasText: "Share your GMX trade on X" });
  await expect(modal).toContainText(/Long 4\.00x/);
  await expect(modal).toContainText("ETH / USD");
  await expect(modal).toContainText(/Entry price\s*\$\s*2,500\.00/);
  await expect(modal).toContainText("Mark price");
  await expect(modal.getByRole("img", { name: "Coin" })).toBeVisible();

  const popup = page.waitForEvent("popup");
  await modal.getByRole("button", { name: "Share on", exact: true }).click();
  const tweet = await popup;
  await expect.poll(() => tweet.url()).toContain("/intent/tweet");
  const intent = new URL(tweet.url());
  expect(intent.searchParams.get("text")).toContain("trade on @GMX_IO");
  const shareUrl = new URL(intent.searchParams.get("url")!);
  expect(shareUrl.pathname).toBe("/api/s");
  expect(shareUrl.searchParams.get("id")).toBe("regression-share");
  expect(uploads).toHaveLength(1);
  expect(new URL(uploads[0]).origin).toBe(shareUrl.origin);

  await modal.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByText("Link copied to clipboard", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(shareUrl.toString());
  await expect(modal.getByRole("button", { name: "Copy image", exact: true })).toBeEnabled();
});
