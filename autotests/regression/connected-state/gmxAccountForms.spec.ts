import { expect, type Locator, type Page } from "@playwright/test";
import { getAbiItem, getAddress, toFunctionSelector, zeroAddress } from "viem";

import IStargate from "../../../sdk/src/abis/IStargate";
import {
  ARBITRUM,
  SOURCE_BASE_MAINNET as BASE,
  SOURCE_BSC_MAINNET as BNB,
  SOURCE_ETHEREUM_MAINNET as ETHEREUM,
} from "../../../sdk/src/configs/chainIds";
import { getMultichainTokenGroups } from "../../../sdk/src/configs/multichainTokens";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { test } from "../fixtures/accountState";
import { connectInjectedWallet } from "../fixtures/injectedWallet";
import { inputNumber, openSettings } from "../fixtures/trade";

const tokenGroups = getMultichainTokenGroups({ includeTestnets: false });
const tokenOn = (symbol: string, chainId: typeof ARBITRUM | typeof BASE | typeof BNB | typeof ETHEREUM) =>
  tokenGroups[symbol]![chainId]!;
const CHAIN_BADGES: Record<string, RegExp> = {
  Arbitrum: /ic_arbitrum[-.]/,
  Base: /ic_base[-.]/,
  BNB: /ic_bsc[-.]/,
  Ethereum: /ic_eth[-.]/,
};
const QUOTE_OFT = toFunctionSelector(getAbiItem({ abi: IStargate, name: "quoteOFT" }));

function overlay(page: Page, title: string) {
  return page.locator(".Modal-content").filter({ has: page.locator(".Modal-title").getByText(title, { exact: true }) });
}

function infoRow(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
}

async function feeAmounts(row: Locator, label: string) {
  const value = (await row.innerText()).split(label)[1];
  return [...value.matchAll(/-?\$?\s*[\d,]+\.?\d*/g)].map((match) => Number(match[0].replace(/[$,\s]/g, "")));
}

async function openAccount(page: Page) {
  await page.getByTestId("user-address").click();
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
}

async function closeAccount(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeHidden();
}

// Holds Stargate quotes until released, so the form can be checked before its fees exist.
async function holdQuotes(page: Page, stargate: string) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let held = 0;
  await page.route("**/*", async (route) => {
    const body = route.request().postData()?.toLowerCase() ?? "";
    if (!body.includes(stargate.slice(2).toLowerCase()) || !body.includes(QUOTE_OFT.slice(2))) return route.fallback();
    held++;
    await released;
    await route.fallback();
  });
  return { release, held: () => held };
}

for (const [name, chainId] of [
  ["Base", BASE],
  ["BNB", BNB],
  ["Ethereum", ETHEREUM],
] as const) {
  test.describe(name, () => {
    test.use({ walletChainId: chainId });

    test(`3.11 connecting on ${name} opens the GMX Account flow instead of wallet trading`, async ({
      page,
      accountState,
    }) => {
      await page.goto("/trade", { waitUntil: "domcontentloaded" });
      await page.getByTestId("networks-dropdown-handle").click();
      await page.getByTestId(`networks-dropdown-${name}`).click();
      await expect(page.getByRole("banner").getByRole("button", { name, exact: true })).toBeVisible();
      await connectInjectedWallet(page, accountState.address);
      await expect(page.getByRole("banner").getByRole("button", { name, exact: true })).toBeVisible();
      await expect(page.getByTestId("confirm-trade-button")).toHaveText("Deposit");
      await openAccount(page);
      await expect(page.getByTestId("gmx-account-balance")).toContainText(/\$\s*0\.00/);
      await expect(page.getByText(`Connected to ${name}`, { exact: true })).toBeVisible();
      await expect(page.getByText("Wallet & GMX Account", { exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("gmx-account-balance")).toBeHidden();
      const settings = await openSettings(page);
      await expect(settings.getByText("Express", { exact: true })).toBeVisible();
      await expect(settings.getByText("Classic", { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => (window as unknown as { ethereum: { chainId: string } }).ethereum.chainId)).toBe(
        `0x${chainId.toString(16)}`
      );
    });
  });
}

test.describe("deposit", () => {
  const baseUsdc = tokenOn("USDC", BASE);

  test.beforeEach(async ({ accountState }) => {
    accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
    accountState.balances.set(getTokenBySymbol(ARBITRUM, "LINK").address, 5n * 10n ** 18n);
    accountState.sourceChainBalances.set(BASE, new Map([[baseUsdc.address, 40n * 10n ** 6n]]));
    accountState.sourceChainBalances.set(ETHEREUM, new Map([[tokenOn("USDT", ETHEREUM).address, 30n * 10n ** 6n]]));
    accountState.sourceChainBalances.set(BNB, new Map([[tokenOn("USDC", BNB).address, 20n * 10n ** 18n]]));
  });

  async function openDepositAssets(page: Page) {
    await openAccount(page);
    await page.getByRole("button", { name: "Deposit to GMX Account", exact: true }).click();
    const modal = overlay(page, "Select asset to deposit");
    return modal.locator("div.cursor-pointer").filter({ has: page.getByTestId("token-icon") });
  }

  test("4.07 4.15 4.16 4.67 deposit assets are listed per source chain with balances, chain badges and bridgeable tokens only", async ({
    page,
    accountState,
  }) => {
    await accountState.connect(page);
    const rows = await openDepositAssets(page);
    const expected = [
      ["USDC", "Base", "40.00"],
      ["USDT", "Ethereum", "30.00"],
      ["USDC", "BNB", "20.00"],
      ["USDC", "Arbitrum", "100.00"],
      ["LINK", "Arbitrum", "5.0000"],
    ];
    await expect(rows).toHaveCount(expected.length);
    for (const [index, [symbol, chain, balance]] of expected.entries()) {
      const row = rows.nth(index);
      await expect(row).toContainText(new RegExp(`^${symbol}${chain}${balance.replace(".", "\\.")}\\$`));
      await expect(row.locator("img:not([data-qa])")).toHaveAttribute("src", CHAIN_BADGES[chain]);
    }
    const modal = overlay(page, "Select asset to deposit");
    for (const [chain, offered] of [
      ["Base", ["USDC"]],
      ["Ethereum", ["USDT"]],
      ["BNB", ["USDC"]],
      ["Arbitrum", ["USDC", "LINK"]],
    ] as const) {
      await modal.getByRole("button", { name: chain, exact: true }).click();
      await expect(rows).toHaveCount(offered.length);
      for (const [index, symbol] of offered.entries()) await expect(rows.nth(index)).toContainText(symbol + chain);
    }
    await rows.filter({ hasText: "LINK" }).click();
    const form = overlay(page, "Deposit to GMX Account");
    await expect(form.getByRole("button", { name: "Available 5.0000 LINK", exact: true })).toBeVisible();
    await form.getByRole("button", { name: /Arbitrum/ }).click();
    await page.getByRole("option").filter({ hasText: "Base" }).click();
    await expect(form.getByRole("button", { name: "Available 40.00 USDC", exact: true })).toBeVisible();
    await expect(form).not.toContainText("LINK");
  });

  test("4.16 a source chain without bridgeable funds names the assets it accepts", async ({ page, accountState }) => {
    accountState.sourceChainBalances.set(BNB, new Map());
    await accountState.connect(page);
    const rows = await openDepositAssets(page);
    await rows.filter({ hasText: "USDCBase" }).click();
    const form = overlay(page, "Deposit to GMX Account");
    await form.getByRole("button", { name: /Base/ }).click();
    await page.getByRole("option").filter({ hasText: "BNB" }).click();
    await expect(form.getByText("No funds available to deposit from BNB", { exact: true })).toBeVisible();
    await expect(form.getByText(/^Receive USDC or USDT into your wallet on BNB/)).toBeVisible();
  });

  test("4.17 4.18 4.19 Base USDC deposit shows a sane network fee and deposit fee and Max fills the balance (network fee includes LayerZero compose gas; no separate native drop row)", async ({
    page,
    accountState,
  }) => {
    accountState.sourceChainBalances.get(BASE)!.set(zeroAddress, 10n ** 16n);
    await accountState.connect(page);
    const rows = await openDepositAssets(page);
    await rows.filter({ hasText: "USDCBase" }).click();
    const form = overlay(page, "Deposit to GMX Account");
    const amount = form.getByPlaceholder("0.00", { exact: true });
    await form.getByRole("button", { name: "Available 40.00 USDC", exact: true }).click();
    await expect.poll(() => inputNumber(amount)).toBe(40);
    await amount.fill("41");
    await expect(form.getByRole("button", { name: "Insufficient balance", exact: true })).toBeDisabled();
    await amount.fill("10");
    const networkFee = infoRow(form, "Network fee");
    await expect(networkFee).toContainText(/-[\d.]+\s*ETH\s*\(-\$\s*[\d.]+\)\s*·\s*Base wallet/);
    const [eth, usd] = await feeAmounts(networkFee, "Network fee");
    expect(-usd).toBeGreaterThan(0.001);
    expect(-usd).toBeLessThan(5);
    expect(usd / eth).toBeGreaterThan(500);
    expect(usd / eth).toBeLessThan(20_000);
    const depositFee = infoRow(form, "Deposit fee");
    await expect(depositFee).toContainText(/-[\d.]+\s*USDC/);
    const [usdcFee] = await feeAmounts(depositFee, "Deposit fee");
    expect(-usdcFee).toBeLessThan(0.1);
    await expect(infoRow(form, "GMX balance")).toContainText(/\$\s?0\.00.*\$\s?10\.00/);
    await expect(form.getByRole("button", { name: /^(Approve USDC|Deposit)$/ })).toBeEnabled();
  });

  test("0.09 deposit stays disabled with a reason until the bridge quote arrives", async ({ page, accountState }) => {
    accountState.sourceChainBalances.get(BASE)!.set(zeroAddress, 10n ** 16n);
    accountState.allowances.set(getAddress(baseUsdc.address), new Map([[getAddress(baseUsdc.stargate), 10n ** 30n]]));
    const quotes = await holdQuotes(page, baseUsdc.stargate);
    await accountState.connect(page);
    const rows = await openDepositAssets(page);
    await rows.filter({ hasText: "USDCBase" }).click();
    const form = overlay(page, "Deposit to GMX Account");
    await form.getByPlaceholder("0.00", { exact: true }).fill("10");
    const button = form.getByRole("button", { name: /^(Loading network fees|Deposit$)/ });
    await expect(button).toHaveText(/Loading network fees/);
    await expect(button).toBeDisabled();
    await expect.poll(quotes.held).toBeGreaterThan(0);
    quotes.release();
    await expect(button).toHaveText("Deposit");
    await expect(button).toBeEnabled();
  });
});

test.describe("withdrawal", () => {
  test.beforeEach(async ({ accountState }) => {
    accountState.balances.set(zeroAddress, 10n ** 16n);
    accountState.gmxBalances.set(accountState.data.collateral.address, 250n * 10n ** 6n);
    accountState.gmxBalances.set(getTokenBySymbol(ARBITRUM, "WETH").address, 10n ** 16n);
  });

  async function openWithdrawal(page: Page, symbol: string, network?: string, amount = "10") {
    await openAccount(page);
    await page.getByRole("button", { name: "Withdraw", exact: true }).click();
    const modal = overlay(page, "Withdraw from GMX Account");
    await modal.getByRole("button", { name: "Select token", exact: true }).click();
    await page.getByRole("option", { name: new RegExp(`^${symbol} `) }).click();
    if (network) {
      // The destination survives reopening the view; the token and amount do not.
      await modal.getByRole("button", { name: /^(Select network|Ethereum|BNB|Base|Arbitrum)/ }).click();
      await page.getByRole("option").filter({ hasText: network }).click();
      await modal.getByPlaceholder("0.00", { exact: true }).fill(amount);
    }
    return modal;
  }

  async function selectGmxAccountGasToken(page: Page, symbol: string) {
    const settings = await openSettings(page);
    const selector = settings
      .getByText("Gas payment token", { exact: true })
      .locator("xpath=..")
      .locator(".SelectorBase-button")
      .filter({ hasText: /^GMX Account/ });
    await selector.click();
    await page.locator(".SelectorBase-panel .tokens-list > div").filter({ hasText: symbol }).click();
    await expect(selector).toContainText(symbol);
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
  }

  test("4.33 withdrawal destinations are the settlement and source chains, without unsupported bridge routes", async ({
    page,
    accountState,
  }) => {
    await accountState.connect(page);
    const modal = await openWithdrawal(page, "USDT");
    await modal.getByRole("button", { name: "Select network", exact: true }).click();
    const options = page.getByRole("option");
    await expect(options).toHaveText(["Ethereum", "BNB", "Arbitrum", "Base"]);
    await expect(options.filter({ hasText: "Base" })).toBeDisabled();
    for (const chain of ["Ethereum", "BNB", "Arbitrum"]) await expect(options.filter({ hasText: chain })).toBeEnabled();
    await options.filter({ hasText: "Ethereum" }).click();
    await modal.getByRole("button", { name: /^USDT/ }).click();
    await page.getByRole("option", { name: /^USDC / }).click();
    await modal.getByRole("button", { name: /Ethereum/ }).click();
    await expect(options).toHaveText(["Ethereum", "BNB", "Base", "Arbitrum"]);
    for (const chain of ["Ethereum", "BNB", "Base", "Arbitrum"]) {
      await expect(options.filter({ hasText: chain })).toBeEnabled();
    }
  });

  // Express simulations only see the balances the app overrides (gas token and WETH), so ETH is withdrawn here.
  test("4.36 4.37 4.66 withdrawal fees follow the GMX Account gas payment token and an empty one is blocked", async ({
    page,
    accountState,
  }) => {
    accountState.gmxBalances.set(getTokenBySymbol(ARBITRUM, "WETH").address, 10n ** 17n);
    await accountState.connect(page);
    let modal = await openWithdrawal(page, "WETH", "Base", "0.01");
    await expect(infoRow(modal, "Network fee")).toContainText(/-[\d.]+\s*USDC\s*\(-\$\s*[\d.]+\)\s*·\s*GMX Account/);
    await expect(infoRow(modal, "Bridge fee")).toContainText(/-[\d.]+\s*WETH\s*\(-\$\s*[\d.]+\)\s*·\s*GMX Account/);
    await expect(infoRow(modal, "Withdraw fee")).toContainText(/-[\d.]+\s*WETH/);
    for (const label of ["Network fee", "Bridge fee"]) {
      const [, usd] = await feeAmounts(infoRow(modal, label), label);
      expect(-usd).toBeGreaterThan(0.001);
      expect(-usd).toBeLessThan(5);
    }
    const [before, after] = await feeAmounts(infoRow(modal, "GMX Account balance"), "GMX Account balance");
    expect(before - after).toBeGreaterThan(5);
    expect(before - after).toBeLessThan(100);
    await expect(modal.getByRole("button", { name: "Withdraw", exact: true })).toBeEnabled();
    await closeAccount(page);

    await selectGmxAccountGasToken(page, "USDT");
    modal = await openWithdrawal(page, "WETH", "Base", "0.01");
    await expect(modal.getByRole("button", { name: /Insufficient USDT/ })).toBeDisabled();
    await expect(modal).toContainText(/Insufficient USDT.*GMX Account/);
    await closeAccount(page);

    await selectGmxAccountGasToken(page, "WETH");
    modal = await openWithdrawal(page, "WETH", "Base", "0.01");
    await expect(infoRow(modal, "Network fee")).toContainText(/-[\d.]+\s*WETH\s*\(-\$\s*[\d.]+\)\s*·\s*GMX Account/);
    await expect(modal.getByRole("button", { name: "Withdraw", exact: true })).toBeEnabled();
  });

  test("0.09 withdrawal stays disabled with a reason until the bridge quote arrives", async ({
    page,
    accountState,
  }) => {
    const quotes = await holdQuotes(page, tokenOn("USDC", ARBITRUM).stargate);
    await accountState.connect(page);
    const modal = await openWithdrawal(page, "USDC", "Base");
    const button = modal.getByRole("button", { name: /^(Loading network fees|Withdraw$)/ });
    await expect(button).toHaveText(/Loading network fees/);
    await expect(button).toBeDisabled();
    await expect.poll(quotes.held).toBeGreaterThan(0);
    quotes.release();
    await expect(button).toHaveText("Withdraw");
    await expect(button).toBeEnabled();
  });
});

test.describe("GM", () => {
  test.beforeEach(async ({ accountState }) => {
    const gm = accountState.data.market.marketTokenAddress;
    const oft = Object.values(tokenGroups).find((group) => group?.[ARBITRUM]?.address === gm)![BASE]!.address;
    accountState.gmxBalances.set(gm, 3n * 10n ** 18n);
    accountState.sourceChainBalances.set(
      BASE,
      new Map([
        [oft, 2n * 10n ** 18n],
        [zeroAddress, 10n ** 16n],
      ])
    );
    accountState.sourceChainBalances.set(ETHEREUM, new Map([[oft, 5n * 10n ** 17n]]));
    accountState.sourceChainBalances.set(BNB, new Map());
  });

  test("4.04 GM balance tooltip lists each chain holding the token, sorted by USD value", async ({
    page,
    accountState,
  }) => {
    const gm = accountState.data.market.marketTokenAddress;
    accountState.balances.set(gm, 10n ** 18n);
    await accountState.connect(page, `/pools/details?market=${gm}`);
    const balance = page.locator(".Tooltip-handle").filter({ hasText: "6.5000 GM" });
    // GM balances wait for market data and every source chain's balance read.
    await expect(balance).toBeVisible({ timeout: 45_000 });
    await balance.hover();
    const tooltip = page.locator(".Tooltip-popup");
    await expect(tooltip).toContainText(
      /^GMX Account balance:.*3\.0000\s*GM\).*Base balance:.*2\.0000\s*GM\).*Arbitrum balance:.*1\.0000\s*GM\).*Ethereum balance:.*0\.50000\s*GM\)$/
    );
    const usd = [...(await tooltip.innerText()).matchAll(/\$\s*([\d.]+)/g)].map((match) => Number(match[1]));
    expect(usd).toHaveLength(4);
    expect(usd).toEqual([...usd].sort((a, b) => b - a));
  });

  test("4.31 GM bridge-in from Base quotes a sane network fee and the GMX Account GM balance after it", async ({
    page,
    accountState,
  }) => {
    const gm = accountState.data.market.marketTokenAddress;
    accountState.sourceChainBalances.set(ETHEREUM, new Map());
    await accountState.connect(page, `/pools/details?market=${gm}`);
    await expect(page.locator(".Tooltip-handle").filter({ hasText: "5.0000 GM" })).toBeVisible({ timeout: 45_000 });
    await page.getByText("Balance", { exact: true }).first().locator("xpath=..").locator("[aria-haspopup]").click();
    await page.getByText("Deposit GM", { exact: true }).click();
    const modal = overlay(page, "Deposit GM: ETH/USD");
    await modal.getByPlaceholder("0.0", { exact: true }).fill("1");
    const networkFee = infoRow(modal, "Network fee");
    await expect(networkFee).toContainText(/-[\d.]+\s*ETH\s*\(-\$\s*[\d.]+\)\s*·\s*Base wallet/);
    const [eth, usd] = await feeAmounts(networkFee, "Network fee");
    expect(-usd).toBeGreaterThan(0.001);
    expect(-usd).toBeLessThan(5);
    expect(usd / eth).toBeGreaterThan(500);
    expect(usd / eth).toBeLessThan(20_000);
    await expect(infoRow(modal, "GMX Account balance")).toContainText(/3\.0000\s*GM.*4\.0000\s*GM/);
    await expect(modal.getByRole("button", { name: "Deposit", exact: true })).toBeEnabled();
  });
});

test.describe("trade collateral", () => {
  test.beforeEach(async ({ accountState }) => {
    accountState.balances.set(zeroAddress, 10n ** 16n);
    accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
    accountState.gmxBalances.set(accountState.data.collateral.address, 250n * 10n ** 6n);
  });

  function tradingMode(settings: Locator, name: string) {
    return settings.getByText(name, { exact: true }).locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
  }

  async function payWith(page: Page, source: "GMX Account" | "Wallet", token: string) {
    await page.getByTestId("margin-collateral-selector").click();
    const modal = page.getByTestId("margin-collateral-selector-modal");
    await modal.getByText(source, { exact: true }).click();
    await modal.getByTestId(`available-token-${token}-${source === "Wallet" ? ARBITRUM : 0}`).click();
    await expect(modal).toBeHidden();
  }

  async function chooseMode(page: Page, name: string) {
    const settings = await openSettings(page);
    await settings.getByText(name, { exact: true }).click();
    await expect(tradingMode(settings, name)).toHaveClass(/(?:^|\s)border-slate-100(?:\s|$)/);
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
  }

  test("4.55 4.56 paying from the GMX Account forces Express, and Classic applies only to wallet collateral", async ({
    page,
    accountState,
  }) => {
    const usdc = accountState.data.collateral.address;
    const margin = page.getByTestId("margin");
    await accountState.connect(page);
    // The Pay selector resets its tab when GMX Account balances arrive; the header total appears once they have.
    await expect(page.getByTestId("user-address")).toContainText(/\$\s*\d/);
    await chooseMode(page, "Classic");
    await expect(margin).toContainText("100.00");

    await payWith(page, "GMX Account", usdc);
    await expect(page.getByText("Express Trading enabled. Disable in", { exact: false })).toBeVisible();
    await expect(margin).toContainText("250.00");
    const settings = await openSettings(page);
    await expect(tradingMode(settings, "Express")).toHaveClass(/(?:^|\s)border-slate-100(?:\s|$)/);
    await settings.getByText("Classic", { exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(margin).toContainText("100.00");
    await expect(margin).not.toContainText("250.00");

    await payWith(page, "GMX Account", usdc);
    await expect(margin).toContainText("250.00");
    await payWith(page, "Wallet", usdc);
    await chooseMode(page, "Classic");
    await expect(margin).toContainText("100.00");
    await accountState.refresh(page);
    await expect(tradingMode(await openSettings(page), "Classic")).toHaveClass(/(?:^|\s)border-slate-100(?:\s|$)/);
  });
});
