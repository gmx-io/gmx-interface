import { expect } from "@playwright/test";
import { formatUnits, getAddress, type Hex } from "viem";
import { formatAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import { inputNumber } from "../fixtures/trade";
import { transferRow } from "../fixtures/transferHistory";

test.use({ liveProfile: "account" });

test.beforeEach(async ({ page, liveWallet }) => {
  await liveWallet.connect(page);
  await page.getByTestId("user-address").click();
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
});

test("4.58 4.60 live GMX Account: funding history search opens actual transfer details and receipt", async ({
  page,
  liveAccount,
  liveAccounts,
}, testInfo) => {
  const result = await liveAccounts.query<{
    multichainFunding: {
      id: string;
      token: string;
      sentTxn: Hex;
      sentTimestamp: number;
      sourceChainId: number;
      settlementChainId: number;
      sentAmount: string;
      operation: "deposit" | "withdrawal";
      isExecutionError: boolean | null;
    }[];
  }>(
    "query($account:String) { multichainFunding(where:{account:$account}) { id token sentTxn sentTimestamp sourceChainId settlementChainId sentAmount operation isExecutionError } }",
    { account: liveAccount.account }
  );
  const transfer = result.multichainFunding
    .filter((item) => getAddress(item.token) === liveAccount.financial!.token)
    .sort((a, b) => b.sentTimestamp - a.sentTimestamp)[0];
  expect(transfer, "The discovered account has indexed USDC funding history").toBeDefined();
  expect(transfer.sourceChainId, "Discovery uses same-chain USDC funding").toBe(0);
  expect((await liveAccounts.rpc.getTransactionReceipt({ hash: transfer.sentTxn })).status).toBe("success");
  await page.getByRole("button", { name: "Transfer history", exact: true }).click();
  const search = page.getByPlaceholder("Search", { exact: true });
  const modal = page.locator(".Modal-content").filter({ has: search });
  await search.fill("no-such-asset");
  await expect(modal.getByText("No transfer history matching search", { exact: true })).toBeVisible();
  await search.fill("USDC");
  await transferRow(modal, transfer).row.first().click();
  const link = page.locator(`.Modal-content a[href="https://arbiscan.io/tx/${transfer.sentTxn}"]`);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  const details = link.locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' Modal-content ')][1]");
  await expect(details).toContainText("Arbitrum");
  await expect(details).toContainText("USDC");
  await expect(details).not.toContainText(/NaN|Infinity|undefined/);
  await testInfo.attach("live-account-transfer", { body: JSON.stringify(transfer), contentType: "application/json" });
});

test("4.02 4.06 live GMX Account: searched USDC asset balance matches DataStore", async ({ page, liveAccount }) => {
  await page.getByTestId("gmx-account-balance").getByRole("button").click();
  const search = page.getByPlaceholder("Search", { exact: true });
  const modal = page.locator(".Modal-content").filter({ has: search });
  await search.fill("USDC");
  await expect(modal.getByText("USDC", { exact: true })).toBeVisible();
  const { amount, decimals } = liveAccount.financial!;
  await expect(modal.getByText(formatAmount(amount, decimals, 2, true)!, { exact: true })).toBeVisible();
});

test("4.34 4.35 4.38 live GMX Account: withdrawal Max uses the real balance and excess is blocked", async ({
  page,
  liveAccount,
}) => {
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  const modal = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Withdraw from GMX Account", { exact: true }) });
  await modal.getByRole("button", { name: "Select token", exact: true }).click();
  await page.getByRole("option", { name: /USDC/ }).click();
  await modal.getByRole("button", { name: "Select network", exact: true }).click();
  await page.getByRole("option", { name: /^Arbitrum/ }).click();
  const amount = modal.getByPlaceholder("0.00", { exact: true });
  const evidence = liveAccount.financial!;
  await amount.fill(formatUnits(evidence.amount + 10n ** BigInt(evidence.decimals), evidence.decimals));
  await expect(modal.getByRole("button", { name: /Insufficient.*balance/ })).toBeDisabled();
  await modal.getByRole("button", { name: /^Available:/ }).click();
  await expect.poll(() => inputNumber(amount)).toBeCloseTo(Number(formatUnits(evidence.amount, evidence.decimals)), 4);
  await amount.clear();
  await expect(modal.getByRole("button", { name: "Enter withdrawal amount", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
});
