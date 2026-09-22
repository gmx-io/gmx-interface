import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";

import { hashString, MOCK_ACCOUNT_PRIVATE_KEY, MockChain } from "domain/testUtils/rpc/mockChain";
import { collectRpcHoles, installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import { getDataQALocator } from "lib/__tests__/testUtils";

import { NetworkFeeSurfaceStory, type BalanceShape } from "./NetworkFeeSurfaces.ct.stories";

type PageLike = {
  locator: (selector: string) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
};

const WALLET_CLASSIC_EXPLANATION = "Wallet transactions pay gas in ETH from your Wallet.";
const WALLET_EXPRESS_EXPLANATION = "Express fees are paid in your Wallet gas payment token. Change it in Settings.";
const GMX_ACCOUNT_EXPLANATION =
  "This action is paid from your GMX Account, so its fee is paid in your GMX Account gas payment token. Change it in Settings.";
const SETTLE_GMX_ACCOUNT_SWITCH_EXPLANATION =
  "Paid from your GMX Account because your Wallet does not have enough USDC for the fee.";
const SETTLE_CLASSIC_FALLBACK_EXPLANATION =
  "Paid in ETH from your Wallet because your Wallet does not have enough USDC for Express.";
const GMX_ACCOUNT_ONLY_BALANCES: BalanceShape = { wallet: "zero", gmxAccount: "huge" };
const WALLET_ETH_ONLY_BALANCES: BalanceShape = { wallet: "nativeOnly", gmxAccount: "zero" };

/** DataStore gas limits, mirroring `MOCK_GAS_LIMITS`: the modals read them through `useGasLimits`, not the state. */
const DATA_STORE_GAS_LIMITS: Record<string, bigint> = {
  DEPOSIT_GAS_LIMIT: 1500000n,
  WITHDRAWAL_GAS_LIMIT: 1500000n,
  SHIFT_GAS_LIMIT: 1500000n,
  SINGLE_SWAP_GAS_LIMIT: 1000000n,
  SWAP_ORDER_GAS_LIMIT: 3000000n,
  INCREASE_ORDER_GAS_LIMIT: 4000000n,
  DECREASE_ORDER_GAS_LIMIT: 4000000n,
  ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1: 600000n,
  ESTIMATED_GAS_FEE_PER_ORACLE_PRICE: 250000n,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR: 10n ** 30n,
  GELATO_RELAY_FEE_MULTIPLIER_FACTOR: 10n ** 30n,
  GLV_DEPOSIT_GAS_LIMIT: 2000000n,
  GLV_WITHDRAWAL_GAS_LIMIT: 2000000n,
  GLV_PER_MARKET_GAS_LIMIT: 100000n,
};

// the stand's two GM markets and their supply as fixed in the stories (the spec cannot import the stories' values)
const GM_MARKET_TOKEN_ADDRESSES = [
  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  "0x450bb6774Dd8a756274E0ab4107953259d2ac541",
];
const GM_TOKEN_TOTAL_SUPPLY = 2_600_000n * 10n ** 18n;

function createChain(): MockChain {
  const chain = new MockChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY });

  for (const [key, value] of Object.entries(DATA_STORE_GAS_LIMITS)) {
    chain.setDataStoreUint(hashString(key), value);
  }

  for (const marketTokenAddress of GM_MARKET_TOKEN_ADDRESSES) {
    chain.setTokenTotalSupply({ token: marketTokenAddress, value: GM_TOKEN_TOTAL_SUPPLY });
  }

  return chain;
}

test.setTimeout(90_000);

const diagnosticsByTest = new Map<string, string[]>();

/** Every test runs offline against a synthetic chain: signer, gas price and gas estimates come from MockChain. */
test.beforeEach(async ({ page }, testInfo) => {
  const diagnostics: string[] = [];
  diagnosticsByTest.set(testInfo.testId, diagnostics);
  page.on("pageerror", (error) => diagnostics.push(`[pageerror] ${error.stack ?? error.message}`));
  page.on("console", (message) => {
    if (message.type() === "warning" || message.text().startsWith("[Metrics]")) {
      diagnostics.push(`[console.${message.type()}] ${message.text()}`);
    }
  });
  // swallowed estimation errors (metrics.pushError) are echoed to the console by the metrics debug logger
  await page.addInitScript(() => localStorage.setItem("debug_metrics", JSON.stringify({ LogErrors: true })));

  await installRpcResponder(page, createChain());
});

test.afterEach(async ({ page: _page }, testInfo) => {
  const diagnostics = diagnosticsByTest.get(testInfo.testId) ?? [];
  diagnosticsByTest.delete(testInfo.testId);
  const holes = collectRpcHoles();

  if (testInfo.status !== testInfo.expectedStatus) {
    if (diagnostics.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[diagnostics] ${testInfo.title}\n${diagnostics.join("\n")}`);
    }
    if (holes.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[rpc holes] ${testInfo.title}\n${holes.map((hole) => `  - ${hole}`).join("\n")}`);
    }
  }
});

function feeRow(page: PageLike): Locator {
  return page.locator(getDataQALocator("info-row-network-fee"));
}

function feeValueHandle(row: Locator): Locator {
  return row.locator(".text-right .Tooltip-handle").first();
}

/** `<amount> <TOKEN> ($<usd>) · <source>`; the formatters use non-breaking spaces */
async function expectFeeValue(row: Locator, token: string, source: string) {
  // fee estimation is throttled and, for GM, asynchronous, so give it room on a loaded machine
  await expect(row).toContainText(new RegExp(`[\\d.,<]+\\s${token}\\s\\(\\$\\s?[\\d.,<]+\\)`), { timeout: 40_000 });
  await expect(row).toContainText(`· ${source}`);
}

function openExecutionDetails(page: PageLike) {
  return page.getByText("Execution details").click();
}

test.describe("Network fee row: token, USD and paying balance (FEDEV-4282)", () => {
  test.describe("Trade box", () => {
    test("Classic: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="tradeBox" />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await openExecutionDetails(page);

      const row = feeRow(page);
      await expectFeeValue(row, "ETH", "Wallet");

      await feeValueHandle(row).hover();
      await expect(page.getByText(WALLET_CLASSIC_EXPLANATION)).toBeVisible();
      await expect(page.getByText("Max network fee:", { exact: true })).toBeVisible();
    });

    test("Express: gas payment token from the wallet, refund in the native token to the wallet", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="tradeBox" express />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await openExecutionDetails(page);

      const row = feeRow(page);
      await expectFeeValue(row, "USDC", "Wallet");

      await feeValueHandle(row).hover();
      await expect(page.getByText(WALLET_EXPRESS_EXPLANATION)).toBeVisible();
      await expect(page.getByText("Max network fee:", { exact: true }).locator("..")).toContainText("USDC");
      const refundLine = page.getByText("Estimated fee refund").locator("..");
      await expect(refundLine).toContainText(" ETH (");
      await expect(refundLine).toContainText("· Wallet");
      await expect(refundLine).not.toContainText("USDC");
    });

    test("GMX Account: gas payment token from the GMX Account", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="tradeBox" multichain />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await openExecutionDetails(page);

      const row = feeRow(page);
      await expectFeeValue(row, "USDC", "GMX Account");
      await expect(row).not.toContainText("· Wallet");

      await feeValueHandle(row).hover();
      await expect(page.getByText(GMX_ACCOUNT_EXPLANATION)).toBeVisible();
    });

    test("Express: the Max fill and its selected state survive the express re-run and a second click (FEDEV-3593)", async ({
      mount,
      page,
    }) => {
      // 1000 USDC in the wallet: the fee comes out of the same balance, so Max holds back the estimated fee + 40 %.
      // The mock chain's fee does not depend on the amount, so this pins the state machine (the selection is kept,
      // the second click is a no-op, the low-balance card stays away), not an amount-dependent fee drift
      await mount(<NetworkFeeSurfaceStory surface="tradeBox" express marginOnlyBalances />);

      const marginInput = page.locator(getDataQALocator("margin-input"));
      const maxButton = page.locator(getDataQALocator("margin-max"));
      const lowBalanceCard = page.getByText(/^Low USDC balance/);
      const maxHint = page.getByText(/^Reserves ~[\d.,]+ USDC for this transaction's fee\./);

      // an empty Express form resolves the fallback fee instead of loading forever
      await expect(maxButton).toBeEnabled({ timeout: 20_000 });
      await expect(maxButton).not.toHaveAttribute("aria-busy", "true");

      await marginInput.fill("500");
      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "Wallet");

      await expect(maxButton).toBeEnabled({ timeout: 20_000 });
      await maxButton.click();
      await expect(maxButton).toHaveAttribute("aria-pressed", "true");
      const firstFill = await marginInput.inputValue();
      expect(Number(firstFill.replace(/,/g, ""))).toBeGreaterThan(990);
      expect(Number(firstFill.replace(/,/g, ""))).toBeLessThan(1000);
      await expect(lowBalanceCard).toHaveCount(0);

      // the express estimate re-runs for the filled amount: the fee row settles, the pill is enabled and still
      // selected, the hint is shown instead of the low-balance card
      await expectFeeValue(feeRow(page), "USDC", "Wallet");
      await expect(maxButton).toBeEnabled({ timeout: 40_000 });
      await expect(maxButton).toHaveAttribute("aria-pressed", "true");
      await expect(maxHint).toBeVisible();
      await expect(lowBalanceCard).toHaveCount(0);

      await maxButton.click();
      await expect(marginInput).toHaveValue(firstFill);
      await expect(maxButton).toHaveAttribute("aria-pressed", "true");
      await expect(maxHint).toBeVisible();
      await expect(lowBalanceCard).toHaveCount(0);
    });

    test("Express without any gas token: the button names the token and the wallet, the banner is rendered (FEDEV-4283)", async ({
      mount,
      page,
    }) => {
      // the wallet covers the margin but nothing else: the pay check passes and the fee shortfall alone blocks the button
      await mount(<NetworkFeeSurfaceStory surface="tradeBox" express marginOnlyBalances />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const blockedButton = page.getByRole("button", { name: "Insufficient USDC in Wallet" });
      await expect(blockedButton).toBeVisible({ timeout: 20_000 });
      await expect(blockedButton).toBeDisabled();
      await expect(page.getByText(/Insufficient USDC in your Wallet for Express fees/)).toBeVisible();
    });
  });

  test.describe("Add TP/SL (FEDEV-4280)", () => {
    test("Classic: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="addTpsl" />);

      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "ETH", "Wallet");
    });

    test("Express: the gas payment token is quoted and the order can be submitted", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="addTpsl" express />);

      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "Wallet");

      await expect(page.getByRole("button", { name: "Insufficient USDC in Wallet" })).toHaveCount(0);
      await expect(page.getByText(/Insufficient USDC in your Wallet for Express fees/)).toHaveCount(0);
    });

    test("Express with a gas payment token that is not approved: the Classic fallback is quoted in ETH", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="addTpsl" express isGasPaymentTokenApproved={false} />);

      await openExecutionDetails(page);
      const row = feeRow(page);
      await expectFeeValue(row, "ETH", "Wallet");

      await feeValueHandle(row).hover();
      await expect(page.getByText(WALLET_CLASSIC_EXPLANATION)).toBeVisible();
    });

    test("Express without any gas token: submission is blocked with the trade box's insufficient-fee state (FEDEV-4283)", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="addTpsl" express zeroBalances />);

      const blockedButton = page.getByRole("button", { name: "Insufficient USDC in Wallet" });
      await expect(blockedButton).toBeVisible({ timeout: 20_000 });
      await expect(blockedButton).toBeDisabled();
      await expect(page.getByText(/Insufficient USDC in your Wallet for Express fees/)).toBeVisible();
    });

    test("GMX Account: gas payment token from the GMX Account", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="addTpsl" multichain />);

      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "GMX Account");
    });
  });

  test.describe("Close position", () => {
    test("Classic: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="close" />);

      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "ETH", "Wallet");
    });

    test("Express, remaining margin sent to the GMX Account: the GMX Account pays", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="close" express receiveToGmxAccount />);

      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "GMX Account");
    });

    test("Express, wallet without a gas token but with ETH: the Classic fallback is quoted in ETH", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="close" express balances={WALLET_ETH_ONLY_BALANCES} />);

      await openExecutionDetails(page);
      const row = feeRow(page);
      await expectFeeValue(row, "ETH", "Wallet");

      await feeValueHandle(row).hover();
      await expect(page.getByText(WALLET_CLASSIC_EXPLANATION)).toBeVisible();
    });
  });

  test.describe("Edit margin", () => {
    test("Classic: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="editMargin" />);

      await page.locator(getDataQALocator("open-position-editor")).click();
      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "ETH", "Wallet");
    });

    test("Express, collateral from the GMX Account: the GMX Account pays", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="editMargin" express collateralFromGmxAccount />);

      await page.locator(getDataQALocator("open-position-editor")).click();
      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "GMX Account");
    });
  });

  test.describe("Order editor", () => {
    test("Classic: the fees tooltip quotes the native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="orderEditor" />);

      await page.locator(getDataQALocator("open-order-editor")).click();
      await page.getByText("Fees", { exact: true }).locator("..").locator(".Tooltip-handle").first().hover();

      const networkFeeLine = page.locator(".Tooltip-row").filter({ hasText: "Network fee:" });
      await expect(networkFeeLine).toContainText(/[\d.,<]+\sETH\s\(\$\s?[\d.,<]+\)/, { timeout: 20_000 });
      await expect(networkFeeLine).toContainText("· Wallet");
    });

    test("GMX Account without the gas token: the update is blocked and the banner offers a deposit of that token (FEDEV-3924)", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="orderEditor" multichain zeroBalances />);

      await page.locator(getDataQALocator("open-order-editor")).click();

      // the stand opens the editor with empty inputs; a price below the mark keeps the order valid so the gas check decides the button.
      // The editor's init effect may overwrite a fill that lands before it under load, so the fills are retried until the state settles.
      const blockedButton = page.getByRole("button", { name: "Insufficient USDC in GMX Account" });
      await expect(async () => {
        await page.locator(getDataQALocator("amount-input-input")).fill("2000");
        await page.locator(getDataQALocator("trigger-price-input-input")).fill("1700");
        await expect(blockedButton).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 30_000 });
      await expect(blockedButton).toBeDisabled();

      const banner = page.getByText("Insufficient USDC for gas in your GMX Account");
      await expect(banner).toBeVisible();
      await expect(banner).not.toContainText(/\d/);

      await page.getByRole("button", { name: "Deposit USDC" }).click();

      await expect(page.locator(getDataQALocator("gmx-account-deposit-probe"))).toHaveText("deposit USDC");
    });
  });

  test.describe("Settle accrued funding fees", () => {
    test("Classic: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="settle" />);

      await expectFeeValue(feeRow(page), "ETH", "Wallet");
    });

    test("Express: gas payment token from the wallet, approved before settling", async ({ mount, page }) => {
      // the control for the approval-free cases below: a wallet that pays does ask for the approval
      const chain = createChain();
      chain.allowance = 0n;
      await installRpcResponder(page, chain);

      await mount(<NetworkFeeSurfaceStory surface="settle" express />);

      await expectFeeValue(feeRow(page), "USDC", "Wallet");
      await expect(page.getByRole("button", { name: "Approve USDC for Express fees" })).toBeVisible();
    });

    test("Express, wallet without a gas token: the GMX Account pays and no approval is asked (FEDEV-3900)", async ({
      mount,
      page,
    }) => {
      const chain = createChain();
      chain.allowance = 0n;
      await installRpcResponder(page, chain);

      await mount(<NetworkFeeSurfaceStory surface="settle" express balances={GMX_ACCOUNT_ONLY_BALANCES} />);

      const row = feeRow(page);
      await expectFeeValue(row, "USDC", "GMX Account");
      await expect(page.getByRole("button", { name: "Settle", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);

      await feeValueHandle(row).hover();
      await expect(page.getByText(SETTLE_GMX_ACCOUNT_SWITCH_EXPLANATION)).toBeVisible();
    });

    test("Express, both balances funded: the fee follows the remaining-margin preference (FEDEV-3900)", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="settle" express receiveToGmxAccount />);

      const row = feeRow(page);
      await expectFeeValue(row, "USDC", "GMX Account");
      await expect(page.getByRole("button", { name: "Settle", exact: true })).toBeEnabled();

      await feeValueHandle(row).hover();
      await expect(page.getByText(GMX_ACCOUNT_EXPLANATION)).toBeVisible();
    });

    test("Express, no gas token in either balance but ETH in the wallet: a wallet transaction in ETH, no approval (FEDEV-3900)", async ({
      mount,
      page,
    }) => {
      const chain = createChain();
      chain.allowance = 0n;
      await installRpcResponder(page, chain);

      await mount(<NetworkFeeSurfaceStory surface="settle" express balances={WALLET_ETH_ONLY_BALANCES} />);

      const row = feeRow(page);
      await expectFeeValue(row, "ETH", "Wallet");
      await expect(page.getByRole("button", { name: "Settle", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);

      await feeValueHandle(row).hover();
      await expect(page.getByText(SETTLE_CLASSIC_FALLBACK_EXPLANATION)).toBeVisible();
    });
  });

  test.describe("GM pools", () => {
    test("Buy GM from the wallet: native token from the wallet", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="gmBuy" />);

      await page.locator(getDataQALocator("gm-first-token-input")).fill("1000");
      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "ETH", "Wallet");
    });

    test("Buy GM from the GMX Account: gas payment token from the GMX Account", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="gmBuy" express gmPaySource="gmxAccount" />);

      await page.locator(getDataQALocator("gm-first-token-input")).fill("1000");
      await openExecutionDetails(page);
      await expectFeeValue(feeRow(page), "USDC", "GMX Account");
    });
  });

  test.describe("Claims", () => {
    test("Claim funding fees: the wallet pays the estimated gas, the button waits for the estimate", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="claimFunding" />);

      const row = feeRow(page);
      await expectFeeValue(row, "ETH", "Wallet");
      await expect(page.getByRole("button", { name: "Claim", exact: true })).toBeEnabled();

      await feeValueHandle(row).hover();
      await expect(page.getByText(WALLET_CLASSIC_EXPLANATION)).toBeVisible();
    });

    test("Claim funding fees: a failed gas estimate leaves the row empty and the button usable", async ({
      mount,
      page,
    }) => {
      const chain = createChain();
      chain.estimateGasError = "execution reverted";
      await installRpcResponder(page, chain);

      await mount(<NetworkFeeSurfaceStory surface="claimFunding" />);

      const claimButton = page.getByRole("button", { name: "Claim", exact: true });
      await expect(claimButton).toBeEnabled({ timeout: 20_000 });
      await expect(feeRow(page)).toContainText("-");
      await expect(feeRow(page)).not.toContainText("ETH");
    });

    test("Claim price impact rebates: the wallet pays the estimated gas", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="claimRebates" />);

      await expectFeeValue(feeRow(page), "ETH", "Wallet");
      await expect(page.getByRole("button", { name: "Claim", exact: true })).toBeEnabled();
    });

    test("Claim funding fees from the GMX Account: gas payment token from the GMX Account", async ({ mount, page }) => {
      await mount(<NetworkFeeSurfaceStory surface="claimFunding" multichain />);

      await expectFeeValue(feeRow(page), "USDC", "GMX Account");
    });

    test("Claim funding fees from the GMX Account without the gas token: a stable insufficient state with a deposit action (FEDEV-3574)", async ({
      mount,
      page,
    }) => {
      await mount(<NetworkFeeSurfaceStory surface="claimFunding" multichain zeroBalances />);

      const blockedButton = page.getByRole("button", { name: "Insufficient USDC in GMX Account" });
      await expect(blockedButton).toBeVisible({ timeout: 20_000 });
      await expect(blockedButton).toBeDisabled();
      await expect(page.getByText("Loading fees...")).toHaveCount(0);
      await expectFeeValue(feeRow(page), "USDC", "GMX Account");

      const banner = page.getByText("Insufficient USDC for gas in your GMX Account");
      await expect(banner).toBeVisible();
      await expect(banner).not.toContainText(/\d/);

      await expect(page.getByRole("button", { name: "Deposit USDC" })).toBeVisible();
    });

    test("Claim funding fees from the GMX Account: a failed fee estimate blocks the button instead of loading forever (FEDEV-3574)", async ({
      mount,
      page,
    }) => {
      const chain = createChain();
      chain.estimateGasError = "execution reverted";
      await installRpcResponder(page, chain);

      await mount(<NetworkFeeSurfaceStory surface="claimFunding" multichain />);

      const blockedButton = page.getByRole("button", { name: "Network fee unavailable" });
      await expect(blockedButton).toBeVisible({ timeout: 20_000 });
      await expect(blockedButton).toBeDisabled();
      await expect(feeRow(page)).toContainText("-");
      await expect(page.getByText("Loading fees...")).toHaveCount(0);
    });
  });
});
