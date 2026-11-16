import { expect } from "@playwright/test";
import { getChainName } from "../../../sdk/src/configs/chains";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { FundingTransfer } from "../fixtures/liveAccounts";
import { transferRow } from "../fixtures/transferHistory";
import { utcParts } from "../fixtures/utcDates";

test.use({ liveProfile: "transfers" });

test("0.10 0.11 4.59 4.61 live GMX Account: indexed cross-chain deposit and withdrawal show settled status and dates after refresh", async ({
  page,
  liveAccount,
  liveAccounts,
  liveWallet,
}, testInfo) => {
  const { deposit, withdrawal } = liveAccount.transfers!;
  const evidence: unknown[] = [];
  for (const reload of [false, true]) {
    const responsePromise = page.waitForResponse(
      (response) => {
        if (!response.ok() || response.url() !== liveAccounts.endpoint || response.request().method() !== "POST")
          return false;
        const body = response.request().postDataJSON();
        return body?.query?.includes("multichainFunding(") && body?.variables?.account === liveAccount.account;
      },
      { timeout: 60_000 }
    );
    if (reload) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
    } else await liveWallet.connect(page);
    await page.getByTestId("user-address").click();
    await page.getByRole("button", { name: "Transfer history", exact: true }).click();
    const indexed = (await (await responsePromise).json()).data.multichainFunding as FundingTransfer[];
    const modal = page.locator(".Modal-content").filter({ has: page.getByPlaceholder("Search", { exact: true }) });

    for (const transfer of [deposit, withdrawal]) {
      // Rows come from the indexer response the page received, not from local pending state.
      expect(indexed.find((item) => item.id === transfer.id)).toMatchObject({
        operation: transfer.operation,
        step: transfer.step,
        sourceChainId: transfer.sourceChainId,
        sentTimestamp: transfer.sentTimestamp,
        sentAmount: transfer.sentAmount,
      });
      const { row, token, label, sent, isDeposit } = transferRow(modal, transfer);
      const date = utcParts(transfer.sentTimestamp);
      await expect(row).toHaveCount(1, { timeout: 45_000 });
      await expect(row.locator("svg.animate-spin")).toHaveCount(0);
      await expect(row.getByText(label, { exact: true })).not.toHaveClass(/text-red-500/);
      await row.click();

      const title = page.getByText(isDeposit ? "Deposit to GMX Account" : "Withdrawal from GMX Account", {
        exact: true,
      });
      await expect(title).toBeVisible();
      const info = (name: string) => modal.getByText(name, { exact: true }).locator("..");
      // Details are fetched again by transfer id, so the values fill in after their own indexer request.
      await expect(info("Date")).toContainText(`${date.day} ${date.month} ${date.year}, ${date.hour}:${date.minute}`, {
        timeout: 45_000,
      });
      const route = info(isDeposit ? "From" : "To");
      await expect(route).toContainText(`${liveAccount.account.slice(0, 6)}`);
      await expect(route).toContainText(` on ${getChainName(transfer.sourceChainId)}`);
      await expect(modal.locator(`a[href$="/tx/${transfer.sentTxn}"]`).first()).toBeVisible();
      await expect(modal.locator(`a[href="https://layerzeroscan.com/tx/${transfer.sentTxn}"]`)).toBeVisible();
      await expect(info("Amount")).toContainText(
        `${formatBalanceAmount(sent, token.decimals, undefined, { isStable: token.isStable })} ${token.symbol}`
      );
      await expect(modal).not.toContainText(/failed|NaN|undefined/);
      evidence.push({ reload, transfer, row: await row.textContent(), details: await info("Date").textContent() });
      await title.getByRole("button").click();
      await expect(title).toBeHidden();
    }
    await page.keyboard.press("Escape");
  }
  await testInfo.attach("live-cross-chain-transfers", {
    body: JSON.stringify(evidence),
    contentType: "application/json",
  });
});
