import assert from "node:assert/strict";
import type { Page } from "@playwright/test";
import { type Hex } from "viem";
import { accountBalance } from "./account";
import { baseStableBalance } from "./bridge";
import { economy, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually } from "./trading";
import { fillUiAccount, changeUiAccount, inspectUiAccount } from "./uiAccount";
import {
  baseUsdc,
  basePool,
  bridgeAmount,
  bridgeReturnAmount,
  inspectUiBridgeDeposit,
  inspectUiBridgeReturn,
  inspectUiBridgeSignature,
} from "./uiBridgeGuard";
import { assertUiInventory } from "./uiOrders";
import type { UiWallet } from "./uiWallet";

export async function depositUiBridge(session: FundedSession, wallet: UiWallet, page: Page) {
  const state = await session.snapshot();
  const inventory = (session.active.inventory ??= {});
  if (!inventory.bridgeAmount) {
    const source = await baseStableBalance(session);
    assert.ok(source >= bridgeAmount, "Bridge requires 3 USDC and native gas on Base");
    assert.equal(await accountBalance(session, state.usdc.address), 0n, "Existing GMX Account funds must not be spent");
    await session.gate(USD, false, 8453);
    Object.assign(inventory, {
      bridgeAmount: bridgeAmount.toString(),
      bridgeSourceBaseline: source.toString(),
      accountBaseline: "0",
      accountAmount: bridgeAmount.toString(),
    });
    await session.save();
  }
  if (!(await session.previousAction("ui:bridge-deposit"))) {
    const button = await fillUiAccount(page, false, bridgeAmount, "Base");
    await wallet.submit(
      {
        purpose: "bridge-deposit",
        chainId: 8453,
        approval: { token: baseUsdc, spender: basePool, amount: bridgeAmount },
        preflight: async (fresh) => {
          assertUiInventory(session, fresh, []);
          assert.equal(await baseStableBalance(session), BigInt(inventory.bridgeSourceBaseline));
          assert.equal(await accountBalance(session, state.usdc.address), 0n);
        },
        inspect: (tx, fresh) => inspectUiBridgeDeposit(tx, session.address, fresh.weth.prices.maxPrice),
      },
      button
    );
  }
  const delivered = await eventually(
    () => accountBalance(session, state.usdc.address),
    (amount) => amount >= (bridgeAmount * 9_950n) / 10_000n,
    600_000
  );
  assert.ok(delivered <= bridgeAmount);
  assert.equal(await baseStableBalance(session), BigInt(inventory.bridgeSourceBaseline) - bridgeAmount);
  inventory.bridgeDelivered = delivered.toString();
  await session.save();
}

export async function returnUiBridge(session: FundedSession, wallet: UiWallet, page: Page) {
  const state = await session.snapshot();
  const inventory = session.active.inventory!;
  assert.ok(inventory.bridgeDelivered);
  const minimum = (bridgeReturnAmount * 9_950n) / 10_000n;
  if (!(await session.previousAction("ui:bridge-withdraw"))) {
    const button = await fillUiAccount(page, true, bridgeReturnAmount, "Base");
    let signedHash: Hex | undefined;
    inventory.bridgeWithdrawalAmount = bridgeReturnAmount.toString();
    inventory.bridgeMinimumReturn = minimum.toString();
    await session.save();
    await wallet.submit(
      {
        purpose: "bridge-withdraw",
        cleanup: true,
        chainId: 8453,
        preflight: async (fresh) => {
          assertUiInventory(session, fresh, []);
          assert.ok((await accountBalance(session, state.usdc.address)) >= bridgeReturnAmount);
        },
        sign: async (request) => {
          await session.gate(USD, true);
          const { typed, rawDigest } = inspectUiBridgeSignature(
            request,
            session,
            await session.snapshot(),
            wallet.relaySimulations
          );
          signedHash = rawDigest;
          return session.signUiTypedData(typed as never);
        },
        inspect: () => {
          throw new Error("Cross-chain withdrawal must use a signed UI relay");
        },
        inspectRelay: (payload, fresh) => {
          assert.ok(signedHash);
          return inspectUiBridgeReturn(payload, session, fresh, signedHash);
        },
      },
      button
    );
  }
  await eventually(
    () => baseStableBalance(session),
    (value) => value >= BigInt(inventory.bridgeSourceBaseline) - bridgeAmount + minimum,
    600_000
  );
  inventory.bridgeReturned = "true";
  await session.save();
}

export async function withdrawUiBridgeDust(session: FundedSession, wallet: UiWallet, page: Page) {
  const token = (await session.snapshot()).usdc.address;
  const amount = await session.remember("bridge-dust", () => accountBalance(session, token));
  assert.ok(amount >= 0n && amount <= 1_000_000n);
  if (!amount) return;
  session.active.inventory!.accountAmount = amount.toString();
  await session.save();
  await changeUiAccount(session, wallet, page, true);
}

export async function changeUiBridgeGas(session: FundedSession, wallet: UiWallet, page: Page, withdraw: boolean) {
  const state = await session.snapshot();
  const inventory = session.active.inventory!;
  const token = state.weth.address;
  const purpose = withdraw ? "bridge-gas-withdraw" : "bridge-gas-deposit";
  const amount = await session.remember(purpose, async () => {
    const current = await accountBalance(session, token);
    if (withdraw) {
      assert.equal(inventory.bridgeGasBaseline, "0");
      assert.ok(current <= BigInt(inventory.bridgeGasAmount));
      return current;
    }
    assert.equal(current, 0n, "Existing GMX Account WETH must not be spent");
    const value = ((USD / 2n) * 10n ** 18n) / state.weth.prices.maxPrice;
    inventory.bridgeGasBaseline = "0";
    inventory.bridgeGasAmount = value.toString();
    await session.save();
    return value;
  });
  if (!amount) return;
  if (!(await session.previousAction(`ui:${purpose}`))) {
    const button = await fillUiAccount(page, withdraw, amount, "Arbitrum", withdraw ? "WETH" : "ETH", 18);
    await wallet.submit(
      {
        purpose,
        cleanup: withdraw,
        preflight: async (fresh) => {
          assertUiInventory(session, fresh, []);
          assert.equal(await accountBalance(session, token), withdraw ? amount : 0n);
          assert.ok((amount * fresh.weth.prices.maxPrice) / 10n ** 18n <= USD);
          if (!withdraw) assert.ok(fresh.nativeUsd >= economy.nativeReserveUsd + USD);
        },
        inspect: (tx, fresh) =>
          inspectUiAccount(tx, session.address, token, amount, withdraw, fresh.weth.prices.maxPrice),
      },
      button
    );
  }
  await eventually(
    () => accountBalance(session, token),
    (current) => current === (withdraw ? 0n : amount)
  );
}
