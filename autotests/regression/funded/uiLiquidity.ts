import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { formatUnits, getAddress, zeroAddress, type Abi } from "viem";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { getContract } from "../../../sdk/src/configs/contracts";
import { checkFeeBudget, economy, USD } from "./economy";
import { chargedFees } from "./journal";
import { readLiquidityContext, liquidityRequestKey, liquidityRequestKeys, lpBalance } from "./liquidity";
import type { FundedSession } from "./session";
import { eventually } from "./trading";
import { inspectUiLiquidity, type UiLiquidityIntent } from "./uiLiquidityGuard";
import { assertUiInventory } from "./uiOrders";
import type { UiWallet } from "./uiWallet";

// 1% form slippage plus 0.5% for pool fees and impact.
const minOutputBps = 9_850n;

async function fillLiquidity(page: Page, token: string, kind: "gm" | "glv", withdraw: boolean, amount: bigint) {
  await page.goto(`/pools/details?market=${token}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  const symbol = kind === "gm" ? "GM" : "GLV";
  await page.getByRole("button", { name: `${withdraw ? "Sell" : "Buy"} ${symbol}`, exact: true }).click();
  await page.getByRole("button", { name: "Single", exact: true }).click();
  const input = page.getByTestId("gm-first-token-input");
  const form = page.locator("form").filter({ has: input });
  const section = page.getByTestId("gm-first-token");
  await section.locator(".TokenSelector").click();
  const search = page.getByPlaceholder("Search", { exact: true });
  await search.fill(withdraw ? "WETH" : "USDC");
  if (withdraw) await page.locator(".TokenSelector-modal").getByText("WETH", { exact: true }).click();
  else
    await page
      .getByTestId(`available-token-${getTokenBySymbol(42161, withdraw ? "WETH" : "USDC").address}-42161`)
      .click();
  await expect(form.locator('button[type="submit"]')).not.toHaveText(/Loading|Connecting/);
  if (withdraw) {
    await page.getByRole("button", { name: "Pair", exact: true }).click();
    await form.getByRole("textbox").last().fill(formatUnits(amount, 18));
    await expect(form).toContainText("WETH");
  } else await input.fill(formatUnits(amount, 6));
  if (kind === "glv") {
    const pool = form
      .locator(".Exchange-info-row")
      .filter({ has: page.getByText("Pool", { exact: true }) })
      .locator(".MarketSelector");
    await pool.click();
    await page.getByPlaceholder("Search pool", { exact: true }).fill("ETH");
    await page
      .locator(".TokenSelector-modal div.cursor-pointer")
      .filter({ has: page.getByText("ETH/USD", { exact: true }) })
      .filter({ has: page.getByText("[WETH-USDC]", { exact: true }) })
      .click();
    await expect(pool).toContainText("ETH/USD");
  }
  return form.locator('button[type="submit"]');
}

export async function changeUiLiquidity(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  kind: "gm" | "glv",
  withdraw: boolean
) {
  const ctx = await readLiquidityContext(session, kind, withdraw);
  const inventory = (session.active.inventory ??= {});
  const purpose = `${kind}-${withdraw ? "withdraw" : "deposit"}`;
  if (!inventory[`${kind}Token`]) {
    assert.ok(!withdraw);
    assert.equal(await lpBalance(session, ctx.token), 0n, "Existing LP tokens must not be spent");
    for (const withdrawal of [false, true]) assert.deepEqual(await liquidityRequestKeys(session, kind, withdrawal), []);
    const exit = await readLiquidityContext(session, kind, true);
    checkFeeBudget(chargedFees(session.active), ctx.fee.feeUsd + USD / 20n, false, session.feePolicy);
    checkFeeBudget(
      chargedFees(session.active) + ctx.fee.feeUsd + USD / 20n,
      exit.fee.feeUsd + USD / 20n,
      true,
      session.feePolicy
    );
    inventory[`${kind}Token`] = ctx.token;
    await session.save();
  }
  assert.equal(getAddress(inventory[`${kind}Token`]), getAddress(ctx.token));
  const plan = await session.remember("ui-liquidity", async () => {
    const amount = withdraw ? await lpBalance(session, ctx.token) : 1_000_000n;
    assert.ok(amount > 0n && (!withdraw || (amount * ctx.tokenPrice) / 10n ** 18n <= 2n * USD));
    const intent: UiLiquidityIntent = {
      kind,
      withdraw,
      account: session.address,
      market: ctx.market.marketToken,
      lpToken: ctx.token,
      usdc: ctx.state.usdc.address,
      weth: ctx.state.weth.address,
      amount,
      nativePrice: ctx.state.weth.prices.maxPrice,
    };
    if (withdraw) {
      const gmAmount = kind === "gm" ? amount : (amount * ctx.tokenPrice) / ctx.gmPrice;
      const outputs = (await session.rpc.readContract({
        abi: SyntheticsReader as Abi,
        address: getContract(42161, "SyntheticsReader"),
        functionName: "getWithdrawalAmountOut",
        args: [getContract(42161, "DataStore"), ctx.market, ctx.prices, gmAmount, zeroAddress, 4],
      })) as [bigint, bigint];
      intent.minLong = (outputs[0] * minOutputBps) / 10_000n;
      intent.minShort = (outputs[1] * minOutputBps) / 10_000n;
      assert.ok(intent.minLong + intent.minShort > 0n);
      inventory[`${kind}WithdrawalOutputs`] = JSON.stringify({
        wrappedAmount: (ctx.state.wrappedAmount + intent.minLong).toString(),
        stableAmount: (ctx.state.stableAmount + intent.minShort).toString(),
      });
      await session.save();
    } else intent.minLp = (USD * 10n ** 18n * minOutputBps) / ctx.tokenPrice / 10_000n;
    return { intent, stable: ctx.state.stableAmount, wrapped: ctx.state.wrappedAmount };
  });
  let action = await session.previousAction(`ui:${purpose}`);
  if (!action) {
    const button = await fillLiquidity(page, ctx.token, kind, withdraw, plan.intent.amount);
    action = await wallet.submit(
      {
        purpose,
        cleanup: withdraw,
        approval: {
          token: withdraw ? ctx.token : ctx.state.usdc.address,
          spender: getContract(42161, "SyntheticsRouter"),
          amount: plan.intent.amount,
        },
        preflight: async (state) => {
          assert.equal(await lpBalance(session, ctx.token), withdraw ? plan.intent.amount : 0n);
          assertUiInventory(session, state, []);
          if (!withdraw) assert.ok(state.stableUsd - USD >= economy.stableReserveUsd + economy.cleanupReserveUsd);
        },
        inspect: (tx, state) => inspectUiLiquidity(tx, { ...plan.intent, nativePrice: state.weth.prices.maxPrice }),
      },
      button
    );
  }
  const key = await liquidityRequestKey(session, kind, withdraw, action);
  await eventually(
    () => liquidityRequestKeys(session, kind, withdraw),
    (keys) => !keys.some((pending) => pending === key),
    180_000
  );
  const held = await lpBalance(session, ctx.token);
  const after = await session.snapshot();
  if (withdraw) {
    assert.equal(held, 0n, "LP withdrawal did not burn the owned tokens");
    assert.ok(
      after.wrappedAmount >= plan.wrapped + plan.intent.minLong! &&
        after.stableAmount >= plan.stable + plan.intent.minShort!,
      "LP outputs did not reach the wallet"
    );
  } else {
    assert.ok(held >= plan.intent.minLp!, "LP deposit did not mint the minimum");
    assert.equal(after.stableAmount, plan.stable - plan.intent.amount);
  }
  return { token: ctx.token, amount: held };
}
