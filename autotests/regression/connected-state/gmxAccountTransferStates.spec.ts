import { expect, type Page } from "@playwright/test";
import { getAddress, toHex, zeroAddress } from "viem";

import { SOURCE_BASE_MAINNET as BASE } from "../../../sdk/src/configs/chainIds";
import { getMultichainTokenGroups } from "../../../sdk/src/configs/multichainTokens";
import { test } from "../fixtures/accountState";

type Transfer = Record<string, unknown> & { id: string };

function transfer(
  account: string,
  token: string,
  index: number,
  overrides: Partial<Record<string, unknown>> & { operation: "deposit" | "withdrawal"; step: string }
): Transfer {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: toHex(index + 1, { size: 32 }),
    account,
    token,
    settlementChainId: 42161,
    sourceChainId: BASE,
    sentAmount: (10n * 10n ** 6n).toString(),
    receivedAmount: null,
    sentTxn: toHex(index + 500, { size: 32 }),
    sentTimestamp: now - 60 * (index + 1),
    receivedTxn: null,
    receivedTimestamp: null,
    executedTxn: null,
    executedTimestamp: null,
    isExecutionError: false,
    ...overrides,
  };
}

// The funding history and the transfer details both read the indexer's multichainFunding query.
async function mockFundingHistory(page: Page, account: string, transfers: Transfer[]) {
  await page.context().route("**/*", async (route) => {
    let body: { query?: string; variables?: { account?: string; guid?: string } } | undefined;
    try {
      body = route.request().method() === "POST" ? route.request().postDataJSON() : undefined;
    } catch {
      return route.fallback();
    }
    if (!body?.query?.includes("multichainFunding(")) return route.fallback();
    const { account: requested, guid } = body.variables ?? {};
    if (requested && getAddress(requested) !== account) return route.fallback();
    const multichainFunding = transfers.filter((item) => !guid || item.id === guid);
    await route.fulfill({ json: { data: { multichainFunding } } });
  });
}

async function openTransfer(page: Page, label: string) {
  const row = page.locator("div[role=button]").filter({ hasText: label });
  await row.click();
  return page.getByRole("button", { name: "Repeat transaction", exact: true }).locator("xpath=..");
}

test("26.01 26.02 26.06 long-pending, compose-failed and failed GMX Account transfers show their indexer status", async ({
  page,
  accountState,
}) => {
  const usdc = accountState.data.collateral.address;
  const receivedAt = Math.floor(Date.now() / 1000) - 100;
  const pending = transfer(accountState.address, usdc, 10, { operation: "deposit", step: "sent" });
  const composeFailed = transfer(accountState.address, usdc, 1, {
    operation: "deposit",
    step: "executed",
    isExecutionError: true,
    sentAmount: (20n * 10n ** 6n).toString(),
    receivedAmount: 19_900_000n.toString(),
    receivedTxn: toHex(700, { size: 32 }),
    receivedTimestamp: receivedAt,
    executedTxn: toHex(701, { size: 32 }),
    executedTimestamp: receivedAt,
  });
  const failedWithdrawal = transfer(accountState.address, usdc, 2, {
    operation: "withdrawal",
    step: "sent",
    isExecutionError: true,
    sentAmount: (30n * 10n ** 6n).toString(),
  });
  await mockFundingHistory(page, accountState.address, [pending, composeFailed, failedWithdrawal]);
  // Without funds on Base the deposit form is replaced by its empty state, so the repeated deposit needs some.
  const baseUsdc = getMultichainTokenGroups({ includeTestnets: false }).USDC![BASE]!;
  accountState.sourceChainBalances.set(
    BASE,
    new Map([
      [baseUsdc.address, 50n * 10n ** 6n],
      [zeroAddress, 10n ** 16n],
    ])
  );
  await accountState.connect(page);
  await page.getByTestId("user-address").click();
  await page.getByRole("button", { name: "Transfer history", exact: true }).click();
  const rows = page.locator("div[role=button]").filter({ has: page.getByTestId("token-icon") });
  await expect(rows).toHaveCount(3);

  // An 11-minute-old pending deposit only spins; no timeout notice.
  const pendingRow = rows.filter({ hasText: "+10.00" });
  await expect(pendingRow).toContainText(/USDCDeposit\+10\.00/);
  await expect(pendingRow.locator("svg.animate-spin")).toBeVisible();
  for (const [amount, label] of [
    ["+20.00", "Deposit failed"],
    ["-30.00", "Withdrawal failed"],
  ]) {
    const status = rows.filter({ hasText: amount }).getByText(label, { exact: true });
    await expect(status).toHaveClass(/text-red-500/);
    await expect(rows.filter({ hasText: amount }).locator("svg.animate-spin")).toHaveCount(0);
  }

  let details = await openTransfer(page, "+10.00");
  await expect(details).toContainText(/From.*on.*Base/);
  await expect(details.getByRole("link").filter({ hasText: /^0x/ })).toHaveCount(2);
  await expect(details.getByText("Fee", { exact: true })).toHaveCount(0);
  await expect(details).not.toContainText(/failed|delay|longer|minutes/i);
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await page.getByTestId("user-address").click();
  await page.getByRole("button", { name: "Transfer history", exact: true }).click();
  details = await openTransfer(page, "+20.00");
  await expect(details.getByText("Deposit from Base failed", { exact: true })).toBeVisible();
  await expect(details).toContainText(/Fee\s*0\.10\s*USDC/);
  await expect(details).not.toContainText(/GMX Account balance|landed|retry/i);
  await details.getByRole("button", { name: "Repeat transaction", exact: true }).click();
  const deposit = page
    .locator(".Modal-content")
    .filter({ has: page.locator(".Modal-title").getByText("Deposit to GMX Account", { exact: true }) });
  await expect(deposit.getByPlaceholder("0.00", { exact: true })).toHaveValue("20");
  await expect(deposit.getByRole("button", { name: /Base/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(deposit).toBeHidden();

  await page.getByTestId("user-address").click();
  await page.getByRole("button", { name: "Transfer history", exact: true }).click();
  details = await openTransfer(page, "-30.00");
  await expect(details.getByText("Withdrawal to Base failed", { exact: true })).toBeVisible();
});
