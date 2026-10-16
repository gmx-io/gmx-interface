import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { decodeFunctionData, erc20Abi, formatUnits, getAddress, parseAbi } from "viem";

import RewardRouter from "../../../sdk/src/abis/RewardRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { assertEmptyStakingPower, stakedGmx } from "./earn";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually } from "./trading";
import { assertUiInventory } from "./uiOrders";
import type { UiTransaction } from "./uiOrderGuard";
import type { UiWallet } from "./uiWallet";

export function inspectUiEarn(
  tx: UiTransaction,
  operation: "stakeGmx" | "unstakeGmx" | "handleRewards",
  amount?: bigint
) {
  assert.equal(getAddress(tx.to), getAddress(getContract(42161, "RewardRouter")));
  assert.equal(tx.value, 0n);
  const call = decodeFunctionData({ abi: RewardRouter, data: tx.data });
  assert.equal(call.functionName, operation);
  if (operation === "handleRewards") assert.deepEqual(call.args, [false, false, false, false, true, true, false]);
  else {
    assert.ok(amount !== undefined && amount > 0n);
    assert.deepEqual(call.args, [amount]);
  }
  return { extraFeeUsd: 0n };
}

async function balance(session: FundedSession, token: string) {
  return session.rpc.readContract({
    abi: erc20Abi,
    address: getAddress(token),
    functionName: "balanceOf",
    args: [session.address],
  });
}

export async function changeUiStake(session: FundedSession, wallet: UiWallet, page: Page, withdraw: boolean) {
  const inventory = (session.active.inventory ??= {});
  const token = getContract(42161, "GMX");
  if (inventory.stakeAmount === undefined) {
    assert.ok(!withdraw);
    assert.equal(await stakedGmx(session), 0n, "Existing stakes and loyalty must not be changed");
    await assertEmptyStakingPower(session);
    inventory.stakePowerBaseline = "0";
    const [held, tokens] = await Promise.all([balance(session, token), session.sdk.fetchTokensData()]);
    const gmx = tokens.find((t) => t.symbol === "GMX");
    assert.ok(gmx && gmx.prices.maxPrice > 0n && held > 0n, "BLOCKED: staking requires existing GMX");
    const cap = (USD * 10n ** 18n) / gmx.prices.maxPrice;
    inventory.stakeAmount = (held < cap ? held : cap).toString();
    inventory.stakeWalletBaseline = held.toString();
    await session.save();
  }
  const amount = BigInt(inventory.stakeAmount);
  const purpose = withdraw ? "unstake" : "stake";
  if (!(await session.previousAction(`ui:${purpose}`))) {
    assert.equal(await stakedGmx(session), withdraw ? amount : 0n);
    await page.goto("/earn/portfolio", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Stake GMX", exact: true }).click();
    const modal = page.locator(".StakeModal .Modal-content");
    if (withdraw) await modal.getByRole("button", { name: "Unstake", exact: true }).click();
    await modal.getByRole("textbox").fill(formatUnits(amount, 18));
    const button = modal.locator("button.primary-action");
    if (withdraw) {
      assert.equal(inventory.stakePowerBaseline, "0");
      const acknowledgment = modal.getByRole("button", { name: /^I acknowledge that I will lose/ });
      await expect
        .poll(
          async () => {
            if (
              (await acknowledgment.isVisible()) &&
              !(await acknowledgment.getAttribute("class"))?.includes("selected")
            ) {
              // The initial account had no stake or rewards; only this run's newly accrued power is reset.
              await acknowledgment.click();
              inventory.uiStakeResetAcknowledged = "true";
            }
            return button.isEnabled();
          },
          { timeout: 45_000 }
        )
        .toBe(true);
    }
    await wallet.submit(
      {
        purpose,
        cleanup: withdraw,
        approval: withdraw ? undefined : { token, spender: getContract(42161, "StakedGmxTracker"), amount },
        preflight: async (state) => {
          assertUiInventory(session, state, []);
          assert.equal(await stakedGmx(session), withdraw ? amount : 0n);
          assert.equal(await balance(session, token), BigInt(inventory.stakeWalletBaseline) - (withdraw ? amount : 0n));
          if (!withdraw) {
            const gmx = (await session.sdk.fetchTokensData()).find((item) => item.symbol === "GMX");
            assert.ok(gmx && (amount * gmx.prices.maxPrice) / 10n ** 18n <= USD);
          }
        },
        inspect: (tx) => inspectUiEarn(tx, withdraw ? "unstakeGmx" : "stakeGmx", amount),
      },
      button
    );
  }
  await eventually(
    () => stakedGmx(session),
    (staked) => staked === (withdraw ? 0n : amount)
  );
  assert.equal(await balance(session, token), BigInt(inventory.stakeWalletBaseline) - (withdraw ? 0n : amount));
  return withdraw ? 0n : amount;
}

async function claimable(session: FundedSession, name: "FeeGmxTracker" | "FeeGlpTracker" | "BonusGmxTracker") {
  return session.rpc.readContract({
    abi: parseAbi(["function claimable(address) view returns(uint256)"]),
    address: getContract(42161, name),
    functionName: "claimable",
    args: [session.address],
  });
}

export async function claimUiRewards(session: FundedSession, wallet: UiWallet, page: Page) {
  const before = await session.remember("ui-claim", async () => {
    const state = await session.snapshot();
    const amount = (await claimable(session, "FeeGmxTracker")) + (await claimable(session, "FeeGlpTracker"));
    assert.ok(amount > 0n, "BLOCKED: no existing staking rewards");
    assert.ok((amount * state.weth.prices.maxPrice) / 10n ** 18n <= 2n * USD, "Claim exceeds $2");
    return { amount, wrappedAmount: state.wrappedAmount };
  });
  if (!(await session.previousAction("ui:claim"))) {
    // The UI always includes multiplier-point staking; it must have no effect on existing loyalty.
    assert.equal(await claimable(session, "BonusGmxTracker"), 0n, "Claim UI would stake existing multiplier points");
    assert.equal(await balance(session, getContract(42161, "BN_GMX")), 0n);
    await page.goto("/earn/portfolio", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Claim rewards", exact: true }).click();
    const modal = page.locator(".Modal-content").filter({ has: page.getByText("Claim rewards", { exact: true }) });
    for (const label of [
      "Stake GMX rewards",
      "Stake esGMX rewards",
      "Convert WETH to ETH",
      "Claim GMX rewards",
      "Claim esGMX rewards",
    ]) {
      const toggle = modal.getByRole("button").filter({ has: page.getByText(label, { exact: true }) });
      if ((await toggle.getAttribute("class"))?.split(/\s+/).includes("selected")) await toggle.click();
    }
    const weth = modal.getByRole("button", { name: /Claim WETH rewards/ });
    if (!(await weth.getAttribute("class"))?.split(/\s+/).includes("selected")) await weth.click();
    await expect(weth).toHaveClass(/selected/);
    await wallet.submit(
      {
        purpose: "claim",
        preflight: async (state) => {
          assertUiInventory(session, state, []);
          assert.equal(await claimable(session, "BonusGmxTracker"), 0n);
          assert.equal(await balance(session, getContract(42161, "BN_GMX")), 0n);
          const amount = (await claimable(session, "FeeGmxTracker")) + (await claimable(session, "FeeGlpTracker"));
          assert.ok(amount > 0n && (amount * state.weth.prices.maxPrice) / 10n ** 18n <= 2n * USD);
        },
        inspect: (tx) => inspectUiEarn(tx, "handleRewards"),
      },
      modal.locator("button.primary-action")
    );
  }
  await eventually(
    () => session.snapshot(),
    (state) => state.wrappedAmount >= before.wrappedAmount + before.amount
  );
  return before.amount;
}
