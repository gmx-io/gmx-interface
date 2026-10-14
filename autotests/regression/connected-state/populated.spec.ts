import { expect, type Page } from "@playwright/test";

import type { ApiPositionInfo } from "../../../sdk/src/utils/positions/types";
import { test, type AccountState } from "../fixtures/accountState";
import { inputNumber, selectMarket } from "../fixtures/trade";

const USD = 10n ** 30n;

function positionRow(page: Page, direction: "Long" | "Short") {
  return page
    .getByTestId("trade-table-large")
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: new RegExp(`ETH/USD.*${direction}`) }),
    });
}

async function openOrders(page: Page) {
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Orders/ })
    .click();
  await expect(
    page.getByTestId("trade-table-large").getByRole("columnheader", { name: "TRIGGER PRICE", exact: true })
  ).toBeVisible();
}

// 0.48 ETH opened at $2,500 with $240 margin and marked at $2,600: PnL ±$48 (±20%), 5x leverage.
// The API path shows these fields as supplied, so each one gets a distinct value to catch a swapped column.
function shownPosition(accountState: AccountState, isLong: boolean): ApiPositionInfo {
  const sizeInTokens = 48n * 10n ** 16n;
  const [entry, mark, margin] = [2500n, 2600n, 240n];
  const pnl = ((isLong ? mark - entry : entry - mark) * sizeInTokens * USD) / 10n ** 18n;
  const netValue = margin * USD + pnl;
  const sizeInUsd = (entry * sizeInTokens * USD) / 10n ** 18n;
  return {
    ...accountState.data.position(isLong),
    sizeInUsd,
    sizeInTokens,
    collateralAmount: margin * 10n ** 6n,
    collateralUsd: margin * USD,
    remainingCollateralAmount: margin * 10n ** 6n,
    remainingCollateralUsd: margin * USD,
    entryPrice: entry * USD,
    markPrice: mark * USD,
    liquidationPrice: (isLong ? 1900n : 3100n) * USD,
    positionValueInUsd: (mark * sizeInTokens * USD) / 10n ** 18n,
    pnl,
    pnlPercentage: (pnl * 10000n) / (margin * USD),
    netValue,
    leverage: (sizeInUsd * 10000n) / (margin * USD),
    leverageWithoutPnl: (sizeInUsd * 10000n) / (margin * USD),
    // Default settings show PnL before fees and leverage without PnL; these variants must not appear.
    leverageWithPnl: (sizeInUsd * 10000n) / netValue,
    pnlAfterAllFees: pnl - 7n * USD,
    netValueAfterAllFees: netValue - 7n * USD,
  };
}

test("8.01 8.02 22.15 mocked long/short rows show each supplied field in its own column and survive refresh", async ({
  page,
  accountState,
}) => {
  accountState.positions = [shownPosition(accountState, true), shownPosition(accountState, false)];
  accountState.orders = [
    { ...accountState.data.order(5, true, 1), triggerPrice: 3000n * 10n ** 12n },
    { ...accountState.data.order(6, true, 2), triggerPrice: 2100n * 10n ** 12n },
  ];
  await accountState.connect(page);
  const expectRows = async () => {
    for (const direction of ["Long", "Short"] as const) {
      const isLong = direction === "Long";
      const cells = positionRow(page, direction).getByRole("cell");
      await expect(positionRow(page, direction)).toHaveCount(1);
      await expect(cells.nth(0)).toContainText(new RegExp(`ETH/USD\\s*5\\.00\\s*x\\s*${direction}`));
      await expect(cells.nth(1)).toContainText(/\$\s*1,200\.00/);
      await expect(cells.nth(2)).toContainText(isLong ? /^\$\s*288\.00/ : /^\$\s*192\.00/);
      await expect(cells.nth(2)).toContainText(
        isLong ? /\+\$\s*48\.00\s*\(\+20\.00%\)/ : /-\$\s*48\.00\s*\(-20\.00%\)/
      );
      await expect(cells.nth(3)).toContainText(/^\$\s*240\.00\s*\(240\.00\sUSDC\)$/);
      await expect(cells.nth(4)).toHaveText(/^\$\s*2,500\.00$/);
      await expect(cells.nth(5)).toHaveText(/^\$\s*2,600\.00$/);
      await expect(cells.nth(6)).toHaveText(isLong ? /^\$\s*1,900\.00$/ : /^\$\s*3,100\.00$/);
      if (isLong) {
        await expect(cells.nth(7)).toContainText(/3,000\.00\s*\$?\s*2,100\.00/);
        await expect(cells.nth(7).getByRole("button", { name: "Set" })).toHaveCount(0);
      } else {
        await expect(cells.nth(7)).toContainText(/—\s*—/);
        await expect(cells.nth(7).getByRole("button", { name: "Set" })).toBeVisible();
      }
      await expect(positionRow(page, direction)).not.toContainText(/4\.17|6\.25|281\.00|185\.00|41\.00|55\.00/);
    }
  };
  await expectRows();
  const size = positionRow(page, "Long").getByRole("cell").nth(1).locator(".cursor-pointer").first();
  await size.click();
  await expect(size).toHaveText(/^0\.48\d*\sETH$/);
  await size.click();
  await accountState.refresh(page);
  await expectRows();
});

test("8.01 mocked position updates are reflected without reloading", async ({ page, accountState }) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  const row = positionRow(page, "Long");
  await expect(row).toContainText(/\$\s*1,000\.00/);
  accountState.positions[0].sizeInUsd = 500n * 10n ** 30n;
  await expect(row.getByRole("cell").nth(1)).toContainText(/\$\s*500\.00/);
  accountState.positions = [];
  await expect(row).toHaveCount(0);
  await expect(page.getByText("No open positions", { exact: true })).toBeVisible();
});

test("8.09 position editor opens Deposit and Withdraw forms without submitting", async ({ page, accountState }) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  await positionRow(page, "Long").getByTestId("position-edit-button").click();
  const modal = page.getByTestId("position-edit-modal");
  await expect(modal).toBeVisible();
  for (const operation of ["Deposit", "Withdraw"]) {
    await modal.getByTestId("operation-tabs").getByRole("button", { name: operation, exact: true }).click();
    const amount = modal.getByTestId("amount-input-input");
    await amount.fill("10");
    await expect.poll(() => inputNumber(amount)).toBe(10);
    await expect(modal.getByTestId("confirm-button")).toBeVisible();
    await expect(modal).not.toContainText(/NaN|Infinity|undefined/);
  }
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(positionRow(page, "Long")).toHaveCount(1);
});

test("8.10 close form accepts a partial size and restores the maximum without submitting", async ({
  page,
  accountState,
}) => {
  accountState.positions = [accountState.data.position(true)];
  await accountState.connect(page);
  await positionRow(page, "Long").getByTestId("position-close-button").click();
  const modal = page.getByTestId("position-close-modal");
  await expect(modal).toBeVisible();
  const amount = modal.getByTestId("amount-input-input");
  await amount.fill("500");
  await expect.poll(() => inputNumber(amount)).toBe(500);
  await modal.getByRole("button", { name: /^Max:/ }).click();
  await expect.poll(() => inputNumber(amount)).toBe(1000);
  await expect(modal.getByTestId("confirm-button")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
});

for (const { type, label } of [
  { type: 3, label: /Limit/i },
  { type: 8, label: /Stop Market/i },
  { type: 5, label: /Take.Profit/i },
  { type: 6, label: /Stop.Loss/i },
]) {
  test(`6.04 6.05 9.01 9.02 22.09 mocked order type ${type} displays its market, size and trigger after refresh`, async ({
    page,
    accountState,
  }) => {
    const order = accountState.data.order(type);
    accountState.orders = [order];
    accountState.positions = [accountState.data.position(true)];
    await accountState.connect(page);
    await openOrders(page);
    const row = page.getByTestId(`order-${order.key}`);
    await expect(row.getByRole("img", { name: "ETH", exact: true }).first()).toBeVisible();
    await expect(row).toContainText(/ETH\/USD\s*Long/);
    await expect(row).not.toContainText("WETH");
    await expect(row).toContainText(label);
    await expect(row).toContainText(type === 5 || type === 6 ? "Full position close" : /\$\s*1,000\.00/);
    await expect(row).toContainText(/2,000\.00/);
    await accountState.refresh(page);
    await expect(row).toContainText(/2,000\.00/);
    await expect(row).toContainText(label);
  });
}

test("9.08 orders remain visible when the selected trade market changes", async ({ page, accountState }) => {
  const order = accountState.data.order(3);
  accountState.orders = [order];
  await accountState.connect(page);
  await openOrders(page);
  const row = page.getByTestId(`order-${order.key}`);
  await expect(row).toBeVisible();
  await selectMarket(page, "BTC");
  await expect(row).toContainText("ETH");
  await selectMarket(page, "ETH");
  await expect(row).toBeVisible();
});

test("9.07 an order removed from the mocked response leaves the active list", async ({ page, accountState }) => {
  const order = accountState.data.order(3);
  accountState.orders = [order];
  await accountState.connect(page);
  await openOrders(page);
  const row = page.getByTestId(`order-${order.key}`);
  await expect(row).toBeVisible();
  accountState.orders = [];
  await expect(row).toHaveCount(0);
  await expect(page.getByText("No open orders", { exact: true })).toBeVisible();
});

for (const { type, title } of [
  { type: 3, title: "Edit Limit Increase: ETH Long" },
  { type: 8, title: "Edit Stop Market: ETH Long" },
  { type: 5, title: "Edit Take-Profit: ETH Long" },
  { type: 6, title: "Edit Stop-Loss: ETH Long" },
]) {
  test(`9.05 ${title} pre-fills the current price and discards unsubmitted edits`, async ({ page, accountState }) => {
    const order = accountState.data.order(type);
    accountState.orders = [order];
    accountState.positions = [accountState.data.position(true)];
    await accountState.connect(page);
    await openOrders(page);
    const row = page.getByTestId(`order-${order.key}`);
    await row.getByRole("button", { name: "Edit order", exact: true }).click();
    await expect(page.getByText(title.replace("ETH", accountState.data.index.symbol), { exact: true })).toBeVisible();
    const price = page.getByTestId("trigger-price-input-input");
    await expect.poll(() => inputNumber(price)).toBe(2000);
    await price.fill("2200");
    await expect.poll(() => inputNumber(price)).toBe(2200);
    await page.keyboard.press("Escape");
    await expect(price).toBeHidden();
    await expect(row).toContainText(/2,000\.00/);
    await row.getByRole("button", { name: "Edit order", exact: true }).click();
    await expect.poll(() => inputNumber(price)).toBe(2000);
  });
}

for (const type of [5, 6]) {
  test(`9.01 9.02 partial exit order type ${type} shows its size instead of a full-close label`, async ({
    page,
    accountState,
  }) => {
    const order = accountState.data.order(type);
    order.sizeDeltaUsd = 500n * 10n ** 30n;
    accountState.orders = [order];
    accountState.positions = [accountState.data.position(true)];
    await accountState.connect(page);
    await openOrders(page);
    const row = page.getByTestId(`order-${order.key}`);
    await expect(row).toContainText(/\$\s*500\.00/);
    await expect(row).not.toContainText("Full position close");
  });
}
