import { expect, type Page } from "@playwright/test";
import { getAddress } from "viem";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { getToken } from "../../../sdk/src/configs/tokens";
import { formatAmount, formatDeltaUsd, formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount } from "../fixtures/liveAccounts";
import { inputNumber } from "../fixtures/trade";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { displayedNumber } from "../fixtures/displayedNumber";

type ApiPosition = {
  contractKey: string;
  indexName: string;
  poolName: string;
  isLong: boolean;
  marketAddress: string;
  sizeInUsd: string;
  remainingCollateralUsd: string;
  collateralUsd: string;
  entryPrice?: string | null;
  markPrice: string;
  liquidationPrice?: string | null;
  pnl: string;
  pnlPercentage: string;
  pendingBorrowingFeesUsd: string;
  pendingFundingFeesUsd: string;
};

function positionRow(page: Page, account: LiveAccount | { position: ApiPosition }) {
  const p = account.position!;
  return page.getByTestId(`position-item-${p.indexName}-${p.poolName}-${p.isLong ? "Long" : "Short"}`);
}

// Every positions response the browser receives, in arrival order.
function recordPositions(page: Page, account: string) {
  const snapshots: ApiPosition[][] = [];
  page.on("response", (response) => {
    if (
      response.ok() &&
      response.url().includes("/v1/positions?") &&
      new URL(response.url()).searchParams.get("address") === account
    )
      void response.json().then(
        (body: ApiPosition[]) => snapshots.push(body),
        () => undefined
      );
  });
  return snapshots;
}

const text = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

test("8.05 live position: displayed unrealized PnL agrees with size times the signed price change", async ({
  page,
  liveAccount,
  liveWallet,
}, testInfo) => {
  const snapshots = recordPositions(page, liveAccount.account);
  await liveWallet.connect(page);
  const handle = positionRow(page, liveAccount).getByRole("cell").nth(2).locator(".numbers").first();
  await handle.hover({ timeout: 45_000 });
  const value = page.getByText("PnL:", { exact: true }).locator("..").locator(".Tooltip-row-value");
  await expect(value).toBeVisible();
  let evidence: unknown;
  // The page repolls with a new mark price, so compare with the latest response seen at each check.
  await expect
    .poll(
      async () => {
        if (!(await value.isVisible())) await handle.hover();
        const position = snapshots.at(-1)?.find((p) => p.contractKey === liveAccount.key);
        if (!position || !position.entryPrice) return "waiting for a positions response";
        const size = Number(position.sizeInUsd) / 1e30;
        const sign = position.isLong ? 1 : -1;
        const expected = size * (Number(position.markPrice) / Number(position.entryPrice) - 1) * sign;
        const shown = displayedNumber((await value.textContent())!);
        evidence = { position, expected, shown, toleranceUsd: size * 0.001 + 0.02 };
        return Math.abs(shown - expected) < size * 0.001 + 0.02 ? true : evidence;
      },
      { timeout: 45_000 }
    )
    .toBe(true);
  await testInfo.attach("live-pnl-calculation", { body: JSON.stringify(evidence), contentType: "application/json" });
});

test("8.01 22.15 live position: every open position is listed and market, side, size and entry survive refresh", async ({
  page,
  liveAccount,
  liveWallet,
}, testInfo) => {
  const snapshots = recordPositions(page, liveAccount.account);
  const p = liveAccount.position!;
  const cells = positionRow(page, liveAccount).getByRole("cell");
  const tab = page.getByTestId("exchange-list-tabs").getByRole("button", { name: /^Positions/ });
  // Every position in the latest response has a row, and the tab count and row count agree with it.
  const expectAllListed = () =>
    expect
      .poll(
        async () => {
          const latest = snapshots.at(-1);
          if (!latest) return "waiting for a positions response";
          const rows = await page.locator('[data-qa^="position-item-"]').count();
          const missing: string[] = [];
          for (const position of latest)
            if (!(await positionRow(page, { position }).count())) missing.push(position.contractKey);
          const count = Number(/\d+/.exec((await tab.textContent()) ?? "")?.[0]);
          return rows === latest.length && count === latest.length && !missing.length
            ? true
            : { rows, count, positions: latest.length, missing };
        },
        { timeout: 45_000 }
      )
      .toBe(true);
  await liveWallet.connect(page);
  await expect(cells.first()).toContainText(p.indexName, { timeout: 45_000 });
  await expect(cells.first()).toContainText(p.isLong ? "Long" : "Short");
  await expect(cells.nth(1)).toContainText(formatUsd(p.sizeInUsd)!);
  await expect(cells.nth(4)).toContainText("$");
  await expectAllListed();
  const before = {
    size: text(await cells.nth(1).locator(".numbers").first().textContent()),
    entry: text(await cells.nth(4).textContent()),
  };
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  await expect(cells.first()).toContainText(p.indexName, { timeout: 45_000 });
  await expect(cells.first()).toContainText(p.isLong ? "Long" : "Short");
  await expect.poll(async () => text(await cells.nth(1).locator(".numbers").first().textContent())).toBe(before.size);
  await expect.poll(async () => text(await cells.nth(4).textContent())).toBe(before.entry);
  await expectAllListed();
  await testInfo.attach("live-positions-refresh", {
    body: JSON.stringify({ before, positions: snapshots.at(-1)?.length }),
    contentType: "application/json",
  });
});

test("17.09 live position: public profile and connected trade agree on position identity and size", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  const size = formatUsd(liveAccount.position!.sizeInUsd)!;
  await page.goto(`/traders/${liveAccount.account}`);
  const row = positionRow(page, liveAccount);
  await expect(row.getByRole("cell").nth(1)).toContainText(size, { timeout: 45_000 });
  await expect(row.getByTestId("position-close-button")).toHaveCount(0);
  await expect(row.getByTestId("position-edit-button")).toHaveCount(0);
  await liveWallet.connect(page);
  await expect(row.getByRole("cell").nth(1)).toContainText(size, { timeout: 45_000 });
  await expect(row.getByTestId("position-close-button")).toBeVisible();
  await expect(row.getByTestId("position-edit-button")).toBeVisible();
});

test("8.09 live position: margin editor rejects empty and oversized withdrawals and resets after dismissal", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page);
  await configureClassicTrading(page);
  const row = positionRow(page, liveAccount);
  await row.getByTestId("position-edit-button").click({ timeout: 45_000 });
  const modal = page.getByTestId("position-edit-modal");
  const input = modal.getByTestId("amount-input-input");
  const confirm = modal.getByTestId("confirm-button");
  await expect(confirm).toBeDisabled();
  await modal.getByTestId("operation-tabs").getByRole("button", { name: "Withdraw", exact: true }).click();
  await input.fill("999999999999999999");
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveText(/Max|Insufficient|margin|leverage|Withdrawal not available/i);
  await input.fill("0.1");
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await row.getByTestId("position-edit-button").click();
  await expect(input).toHaveValue("");
  await expect(confirm).toBeDisabled();
});

test("8.10 live position: partial close keeps its input when leverage retention is toggled and Max disables it", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page);
  await configureClassicTrading(page);
  await positionRow(page, liveAccount).getByTestId("position-close-button").click({ timeout: 45_000 });
  const modal = page.getByTestId("position-close-modal");
  const input = modal.getByTestId("amount-input-input");
  const half = (Number(liveAccount.position!.sizeInUsd) / 1e30 / 2).toFixed(2);
  await input.fill(half);
  const toggle = modal
    .getByText(/^Keep leverage at/)
    .locator("xpath=ancestor::div[contains(@class, 'inline-flex')][1]")
    .locator("div.cursor-pointer");
  await expect(toggle).not.toHaveClass(/pointer-events-none/);
  const checked = (await toggle.getAttribute("class"))!.includes("bg-blue-400");
  await toggle.click();
  if (checked) await expect(toggle).not.toHaveClass(/bg-blue-400/);
  else await expect(toggle).toHaveClass(/bg-blue-400/);
  await expect.poll(() => inputNumber(input)).toBe(Number(half));
  await modal.getByRole("button", { name: /^Max:/ }).click();
  await expect(toggle).toHaveClass(/pointer-events-none/);
  await expect.poll(() => inputNumber(input)).toBeCloseTo(Number(liveAccount.position!.sizeInUsd) / 1e30, 2);
  await expect(modal).not.toContainText(/NaN|Infinity|undefined/);
});

test("8.10 live position: Close opens the position seller, Max uses the real size and dismissal preserves the position", async ({
  page,
  liveAccount,
  liveWallet,
  liveAccounts,
}) => {
  await liveWallet.connect(page);
  const row = positionRow(page, liveAccount);
  await row.getByTestId("position-close-button").click({ timeout: 45_000 });
  const modal = page.getByTestId("position-close-modal");
  await expect(modal.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' Modal ')][1]")).toHaveCSS(
    "opacity",
    "1"
  );
  await modal.getByRole("button", { name: /^Max:/ }).click();
  await expect
    .poll(() => inputNumber(modal.getByTestId("amount-input-input")))
    .toBeCloseTo(Number(liveAccount.position!.sizeInUsd) / 1e30, 2);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(row).toBeVisible();
  expect(
    (await liveAccounts.positions(liveAccount.account)).find((p) => p.contractKey === liveAccount.key)?.sizeInUsd
  ).toBe(liveAccount.position!.sizeInUsd);
});

test("5.21 8.03 22.13 live position: size, margin, entry, mark, liquidation price and leverage match the positions response", async ({
  page,
  liveAccount,
  liveWallet,
  chainId,
}, testInfo) => {
  const snapshots = recordPositions(page, liveAccount.account);
  await liveWallet.connect(page);
  const cells = positionRow(page, liveAccount).getByRole("cell");
  await expect(cells.nth(5)).toContainText("$", { timeout: 45_000 });
  const market = MARKETS[chainId as 42161 | 43114][getAddress(liveAccount.position!.marketAddress)];
  const visualMultiplier = getToken(chainId, market.indexTokenAddress).visualMultiplier;
  // Default display excludes PnL: size / (collateral - pending borrow and funding fees), shown with 2 decimals.
  const leverage = (p: ApiPosition) => {
    const margin = BigInt(p.collateralUsd) - BigInt(p.pendingBorrowingFeesUsd) - BigInt(p.pendingFundingFeesUsd);
    return margin > 0n ? text(`${formatAmount((BigInt(p.sizeInUsd) * 10_000n) / margin, 4, 2)} x`) : "...";
  };
  let evidence: unknown;
  await expect
    .poll(
      async () => {
        const shown = {
          size: text(await cells.nth(1).locator(".numbers").first().textContent()),
          margin: text(await cells.nth(3).locator(".position-list-collateral").textContent()),
          entry: text(await cells.nth(4).textContent()),
          mark: text(await cells.nth(5).textContent()),
          liquidation: text(await cells.nth(6).textContent()),
          leverage: text(await cells.first().locator(".Exchange-list-info-label .numbers").first().textContent()),
        };
        // Entry, mark and liquidation share the market's display precision.
        const displayDecimals = shown.mark.split(".")[1]?.length ?? 0;
        const price = (value: string | null | undefined, maxThreshold?: string) =>
          value ? text(formatUsd(BigInt(value), { displayDecimals, visualMultiplier, maxThreshold })) : "NA";
        for (const snapshot of [...snapshots].reverse()) {
          const p = snapshot.find((item) => item.contractKey === liveAccount.key);
          if (!p) continue;
          const expected = {
            size: text(formatUsd(BigInt(p.sizeInUsd))),
            margin: text(formatUsd(BigInt(p.remainingCollateralUsd))),
            entry: price(p.entryPrice),
            mark: price(p.markPrice),
            liquidation: price(p.liquidationPrice, "1000000"),
            leverage: leverage(p),
          };
          if (JSON.stringify(expected) === JSON.stringify(shown)) {
            evidence = { shown, position: p, responses: snapshots.length };
            return true;
          }
        }
        return shown;
      },
      { timeout: 45_000 }
    )
    .toBe(true);
  await testInfo.attach("live-position-row", { body: JSON.stringify(evidence), contentType: "application/json" });
});

test("8.04 live position: PnL in USD and percent follows new position responses without a reload", async ({
  page,
  liveAccount,
  liveWallet,
}, testInfo) => {
  const snapshots = recordPositions(page, liveAccount.account);
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  await liveWallet.connect(page);
  await expect(positionRow(page, liveAccount)).toBeVisible({ timeout: 45_000 });
  const loads = navigations;
  const first = new Map<string, { usd: string; percent: string; response: number }>();
  const updates: { usd?: unknown; percent?: unknown } = {};
  // Any listed position may be the first to move, so follow every uniquely identifiable row.
  await expect
    .poll(
      async () => {
        const response = snapshots.length - 1;
        for (const p of snapshots[response] ?? []) {
          const row = positionRow(page, { position: p });
          if ((await row.count()) !== 1) continue;
          const shown = text(await row.getByRole("cell").nth(2).locator("div.text-body-small").textContent());
          if (shown !== text(formatDeltaUsd(BigInt(p.pnl), BigInt(p.pnlPercentage)))) continue;
          const [usd, percent] = shown.split(" (");
          const before = first.get(p.contractKey);
          if (!before) first.set(p.contractKey, { usd, percent, response });
          else if (response > before.response) {
            const after = { position: p.contractKey, before, shown, response };
            if (before.usd !== usd) updates.usd ??= after;
            if (before.percent !== percent) updates.percent ??= after;
          }
        }
        return updates.usd && updates.percent ? true : updates;
      },
      { timeout: 130_000, intervals: [1_000] }
    )
    .toBe(true);
  expect(navigations, "PnL must update without reloading the page").toBe(loads);
  await testInfo.attach("live-pnl-update", { body: JSON.stringify(updates), contentType: "application/json" });
});

test("22.16 live position: pending borrow and funding fees in the net value tooltip track the positions response", async ({
  page,
  liveAccount,
  liveWallet,
}, testInfo) => {
  const snapshots = recordPositions(page, liveAccount.account);
  await liveWallet.connect(page);
  // The net value cell stays clear of the sticky actions column that can cover the margin cell.
  const handle = positionRow(page, liveAccount).getByRole("cell").nth(2).locator(".numbers").first();
  await handle.hover({ timeout: 45_000 });
  const value = (label: string) => page.getByText(label, { exact: true }).locator("..").locator(".Tooltip-row-value");
  await expect(value("Borrow fee:")).toBeVisible();
  const observed: unknown[] = [];
  // The second round needs a response received after the first match.
  for (let round = 0; round < 2; round++) {
    const from = round === 0 ? 0 : snapshots.length;
    await expect
      .poll(
        async () => {
          // Reopen the tooltip if a layout change moved the row away from the pointer.
          if (!(await value("Borrow fee:").isVisible())) await handle.hover();
          const shown = {
            borrow: text(await value("Borrow fee:").textContent()),
            funding: text(await value("Negative funding fee:").textContent()),
          };
          for (let i = snapshots.length - 1; i >= from; i--) {
            const p = snapshots[i].find((item) => item.contractKey === liveAccount.key);
            if (!p) continue;
            const expected = {
              borrow: text(formatUsd(-BigInt(p.pendingBorrowingFeesUsd))),
              funding: text(formatUsd(-BigInt(p.pendingFundingFeesUsd))),
            };
            if (JSON.stringify(expected) === JSON.stringify(shown)) {
              observed.push({ response: i, shown, borrowingFeesUsd: p.pendingBorrowingFeesUsd });
              return true;
            }
          }
          return shown;
        },
        { timeout: 45_000 }
      )
      .toBe(true);
  }
  await testInfo.attach("live-pending-fees", { body: JSON.stringify(observed), contentType: "application/json" });
});
