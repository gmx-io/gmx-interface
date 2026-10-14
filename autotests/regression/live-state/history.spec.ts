import { expect } from "@playwright/test";
import { formatDeltaUsd } from "../../../sdk/src/utils/numbers/utils";
import { displayedNumber } from "../fixtures/displayedNumber";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "history" });

for (const connected of [false, true]) {
  test(`10.03 10.05 live trade history: executed trade shows its indexed action label and explorer link ${connected ? "with a read-only wallet" : "on the public trader page"}`, async ({
    page,
    liveAccount,
    liveAccounts,
    liveWallet,
    chainId,
  }) => {
    const { tradeActions } = await liveAccounts.query<{ tradeActions: { orderType: number; isLong: boolean }[] }>(
      'query($hash: String!, $account: String!) { tradeActions(limit: 1, where: {transactionHash_eq: $hash, account_eq: $account, eventName_eq: "OrderExecuted"}) { orderType isLong } }',
      { hash: liveAccount.transactionHash, account: liveAccount.account }
    );
    const action = tradeActions[0];
    expect(action, "Indexed execution for the selected transaction").toBeDefined();
    // Discovery selects executed market orders with a non-zero size.
    const label = action.orderType === 2 ? "Market Increase" : "Market Decrease";
    if (connected) await liveWallet.connect(page);
    else await page.goto(`/traders/${liveAccount.account}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Trades", exact: true }).click();
    const row = page
      .locator("tr")
      .filter({ has: page.locator(`a[href$='/tx/${liveAccount.transactionHash}']`) })
      .filter({ has: page.getByText(label, { exact: true }) })
      .first();
    const link = row.locator(`a[href$='/tx/${liveAccount.transactionHash}']`);
    await expect(link).toBeVisible({ timeout: 45_000 });
    await expect(link).toHaveAttribute(
      "href",
      `${chainId === 42161 ? "https://arbiscan.io" : "https://snowtrace.io"}/tx/${liveAccount.transactionHash}`
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(row.getByRole("cell").nth(1)).toContainText(action.isLong ? "Long" : "Short");
    await expect(row).not.toContainText(/NaN|Infinity|undefined/);
    if (!connected) await expect(page.getByTestId("user-address")).toHaveCount(0);
  });
}

test.describe("fees", () => {
  test.use({ liveProfile: "fees" });

  test("10.02 live trade history: open and close rows show the indexed position fees", async ({
    page,
    liveAccount,
    liveAccounts,
  }, testInfo) => {
    type Action = {
      id: string;
      orderType: number;
      transactionHash: string;
      collateralTokenPriceMin: string;
      positionFeeAmount: string;
      traderDiscountAmount: string | null;
      borrowingFeeAmount: string | null;
      fundingFeeAmount: string | null;
    };
    const responsePromise = page.waitForResponse(
      (response) => {
        if (!response.ok() || response.url() !== liveAccounts.endpoint || response.request().method() !== "POST")
          return false;
        const query = String(response.request().postDataJSON()?.query ?? "");
        return query.includes("tradeActions(") && query.includes("offset: 0") && query.includes(liveAccount.account);
      },
      { timeout: 60_000 }
    );
    await page.goto(`/traders/${liveAccount.account}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Trades", exact: true }).click();
    const { data } = (await (await responsePromise).json()) as { data: { tradeActions: Action[] } };
    const evidence: unknown[] = [];
    const breakdown = new Set([
      "Open fee:",
      "Close fee:",
      "Referral discount:",
      "Borrow fee:",
      "Funding fee:",
      "Liquidation fee:",
      "Net price impact:",
      "Price impact:",
      "Swap fee:",
      "Swap price impact:",
    ]);
    for (const id of [liveAccount.trades!.open, liveAccount.trades!.close]) {
      const action = data.tradeActions.find((a) => a.id === id);
      expect(action, `Indexed trade action ${id} is in the browser's first history page`).toBeDefined();
      const usd = (amount: string | null) => BigInt(amount ?? 0) * BigInt(action!.collateralTokenPriceMin);
      const expected: Record<string, string> = {
        [[2, 3, 8].includes(action!.orderType) ? "Open fee:" : "Close fee:"]: formatDeltaUsd(
          -usd(action!.positionFeeAmount)
        )!,
      };
      if (usd(action!.traderDiscountAmount))
        expected["Referral discount:"] = formatDeltaUsd(usd(action!.traderDiscountAmount))!;
      if (usd(action!.borrowingFeeAmount)) expected["Borrow fee:"] = formatDeltaUsd(-usd(action!.borrowingFeeAmount))!;
      if (usd(action!.fundingFeeAmount)) expected["Funding fee:"] = formatDeltaUsd(-usd(action!.fundingFeeAmount))!;

      const row = page
        .locator("tr")
        .filter({ has: page.locator(`a[href$='/tx/${action!.transactionHash}']`) })
        .filter({ hasNotText: /Create|Cancel|Update|Request/ })
        .first();
      const fees = row.getByRole("cell").nth(5);
      await expect(fees).toContainText("$", { timeout: 45_000 });
      const tooltip = page.locator(".TradeHistoryRow-tooltip").filter({ has: page.locator(".Tooltip-row") });
      // Charts above the list can finish loading after the hover and move the row away from the pointer.
      await expect(async () => {
        await fees.locator(".numbers").first().hover();
        await expect(tooltip).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 30_000 });
      const lines = Object.fromEntries(
        await tooltip
          .locator(".Tooltip-row")
          .evaluateAll((rows) =>
            rows.map((r) => [
              r.querySelector(".Tooltip-row-label")?.textContent?.trim() ?? "",
              r.querySelector(".Tooltip-row-value")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
            ])
          )
      ) as Record<string, string>;
      for (const [label, value] of Object.entries(expected))
        expect(lines[label], label).toBe(value.replace(/\s+/g, " "));
      const parts = Object.entries(lines).filter(([label]) => breakdown.has(label));
      const total = parts.reduce((sum, [, value]) => sum + displayedNumber(value), 0);
      expect(Math.abs(displayedNumber((await fees.textContent())!) - total)).toBeLessThanOrEqual(0.01 * parts.length);
      evidence.push({ action, lines, total: await fees.textContent() });
      await page.getByRole("button", { name: "Trades", exact: true }).hover();
      await expect(tooltip).toBeHidden();
    }
    await testInfo.attach("live-trade-fees", { body: JSON.stringify(evidence), contentType: "application/json" });
  });
});
