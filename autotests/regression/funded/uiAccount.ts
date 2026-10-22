import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { decodeFunctionData, formatUnits, getAddress, zeroAddress } from "viem";

import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { accountBalance } from "./account";
import { economy, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually } from "./trading";
import { assertUiInventory } from "./uiOrders";
import type { UiTransaction } from "./uiOrderGuard";
import type { UiWallet } from "./uiWallet";

export function inspectUiAccount(
  tx: UiTransaction,
  account: string,
  token: string,
  amount: bigint,
  withdraw: boolean,
  nativePrice?: bigint
) {
  if (nativePrice !== undefined) {
    assert.equal(getAddress(token), getAddress(getContract(42161, "NATIVE_TOKEN")));
    assert.ok(nativePrice > 0n && amount > 0n && (amount * nativePrice) / 10n ** 18n <= USD);
  } else assert.ok(amount > 0n && amount <= 1_000_000n);
  const native = nativePrice !== undefined && !withdraw;
  assert.equal(getAddress(tx.to), getAddress(getContract(42161, "MultichainTransferRouter")));
  assert.equal(tx.value, native ? amount : 0n);
  const call = decodeFunctionData({ abi: MultichainTransferRouter, data: tx.data });
  if (withdraw) {
    assert.equal(call.functionName, "transferOut");
    if (call.functionName !== "transferOut") throw new Error("Expected account withdrawal");
    assert.deepEqual(call.args[0], {
      token: getAddress(token),
      amount,
      minAmountOut: amount,
      provider: zeroAddress,
      data: "0x",
    });
  } else {
    assert.equal(call.functionName, "multicall");
    if (call.functionName !== "multicall") throw new Error("Expected account deposit batch");
    const calls = call.args[0].map((data) => decodeFunctionData({ abi: MultichainTransferRouter, data }));
    assert.deepEqual(
      calls.map((c) => c.functionName),
      [native ? "sendWnt" : "sendTokens", "bridgeIn"]
    );
    assert.deepEqual(
      calls[0].args,
      native
        ? [getAddress(getContract(42161, "MultichainVault")), amount]
        : [getAddress(token), getAddress(getContract(42161, "MultichainVault")), amount]
    );
    assert.deepEqual(calls[1].args, [getAddress(account), getAddress(token)]);
  }
  return { extraFeeUsd: 0n };
}

export async function fillUiAccount(
  page: Page,
  withdraw: boolean,
  amount: bigint,
  network = "Arbitrum",
  symbol = "USDC",
  decimals = 6
) {
  await page.goto("/trade", { waitUntil: "domcontentloaded" });
  await page.getByTestId("user-address").click();
  await page.getByRole("button", { name: withdraw ? "Withdraw" : "Deposit to GMX Account", exact: true }).click();
  const modal = page.locator(".Modal-content").filter({
    has: page.getByText(withdraw ? "Withdraw from GMX Account" : "Deposit to GMX Account", { exact: true }),
  });
  if (withdraw) {
    await modal.getByRole("button", { name: "Select token", exact: true }).click();
    await page.getByRole("option", { name: new RegExp(`^${symbol}\\b`) }).click();
    await modal.getByRole("button", { name: "Select network", exact: true }).click();
    await page.getByRole("option", { name: new RegExp(`^${network}`) }).click();
  } else {
    await page.getByPlaceholder("Search", { exact: true }).fill(symbol);
    await page
      .locator("div.cursor-pointer")
      .filter({ has: page.getByText(symbol, { exact: true }) })
      .filter({ has: page.getByText(network, { exact: true }) })
      .click();
    await expect(modal.getByRole("button", { name: new RegExp(`^${network}`) })).toBeVisible();
  }
  await modal.getByPlaceholder("0.00", { exact: true }).fill(formatUnits(amount, decimals));
  const button = modal.locator("button.primary-action");
  await expect(button).toBeEnabled();
  return button;
}

export async function changeUiAccount(session: FundedSession, wallet: UiWallet, page: Page, withdraw: boolean) {
  const state = await session.snapshot();
  const inventory = (session.active.inventory ??= {});
  if (inventory.accountBaseline === undefined) {
    assert.ok(!withdraw, "Deposit ownership is missing");
    assert.equal(await accountBalance(session, state.usdc.address), 0n, "Existing GMX Account funds must not be spent");
    inventory.accountBaseline = "0";
    inventory.accountAmount = "1000000";
    await session.save();
  }
  assert.equal(inventory.accountBaseline, "0");
  const before = await session.remember("ui-account-balances", async () => ({ stable: state.stableAmount }));
  const amount = BigInt(inventory.accountAmount);
  const purpose = withdraw ? "account-withdraw" : "account-deposit";
  if (!(await session.previousAction(`ui:${purpose}`))) {
    assert.equal(await accountBalance(session, state.usdc.address), withdraw ? amount : 0n);
    const button = await fillUiAccount(page, withdraw, amount);
    await wallet.submit(
      {
        purpose,
        cleanup: withdraw,
        approval: withdraw
          ? undefined
          : { token: state.usdc.address, spender: getContract(42161, "SyntheticsRouter"), amount },
        preflight: async (fresh) => {
          assert.equal(await accountBalance(session, state.usdc.address), withdraw ? amount : 0n);
          assertUiInventory(session, fresh, []);
          if (!withdraw) assert.ok(fresh.stableUsd - USD >= economy.stableReserveUsd + economy.cleanupReserveUsd);
        },
        inspect: (tx) => inspectUiAccount(tx, session.address, state.usdc.address, amount, withdraw),
      },
      button
    );
  }
  await eventually(
    () => accountBalance(session, state.usdc.address),
    (balance) => balance === (withdraw ? 0n : amount)
  );
  assert.equal((await session.snapshot()).stableAmount, before.stable + (withdraw ? amount : -amount));
}
