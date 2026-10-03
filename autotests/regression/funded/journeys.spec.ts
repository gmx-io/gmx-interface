import { expect, test } from "@playwright/test";

import { depositAccount, withdrawAccount } from "./account";
import { depositBridge, withdrawBridge } from "./bridge";
import { checkAccount, checkLp, checkOrder, checkPosition, checkStake, connectFundedWallet } from "./browser";
import { selectedCasesFromEnvironment } from "./catalog";
import { claimRewards, stake, unstake } from "./earn";
import { fundedErrorMessage } from "./errors";
import { depositLiquidity, withdrawLiquidity } from "./liquidity";
import { FundedSession } from "./session";
import { cancelOrders, changePosition, createTrigger, editTrigger, swap, twap } from "./trading";

for (const scenario of selectedCasesFromEnvironment()) {
  test(`@${scenario.group} ${scenario.id}: ${scenario.title}`, async ({ page, context }, testInfo) => {
    test.setTimeout(scenario.id === "bridge" ? 1_500_000 : 600_000);
    const session = new FundedSession();
    await session.resume(process.env.REGRESSION_FUNDED_RUN_ID);
    const scenarios = (session.active.scenarios ??= {});
    const record = (scenarios[scenario.id] ??= { startedAt: new Date().toISOString(), status: "running" });
    let phase = "connect read-only wallet";
    const step = <T>(name: string, action: () => Promise<T>) =>
      test.step(name, () => {
        phase = name;
        return session.step(`${scenario.id}:${name}`, action);
      });
    try {
      await test.step(phase, () => connectFundedWallet(page, context, session));
      if (scenario.id === "smoke-refresh" || scenario.group === "trading") {
        const isLong = scenario.id !== "market-short";
        await step("open and refresh", async () => {
          const opened = await session.openSmallPosition(isLong, scenario.group === "trading" ? 2 : 1);
          await checkPosition(page, opened.sizeUsd, isLong);
        });
        if (scenario.group === "trading") {
          for (const operation of ["increase", "deposit", "withdraw", "partial"] as const) {
            await step(operation, async () => {
              const size = await changePosition(session, operation);
              await checkPosition(page, size, isLong);
            });
          }
        }
        await step("close", async () => {
          await changePosition(session, "close");
          await checkPosition(page, 0n);
        });
      } else if (scenario.id === "tp-sl") {
        await step("open", () => session.openSmallPosition(true));
        for (const kind of ["take-profit", "stop-loss"] as const) {
          const key = await step(`create ${kind}`, async () => {
            const key = await createTrigger(session, true, kind);
            await checkOrder(page, key);
            return key;
          });
          await step(`edit ${kind}`, async () => {
            await editTrigger(session, key);
            await checkOrder(page, key);
          });
          await step(`cancel ${kind}`, async () => {
            await cancelOrders(session, [key]);
            await checkOrder(page, key, false);
          });
        }
        await step("close", () => changePosition(session, "close"));
      } else if (scenario.id === "twap") {
        const key = await step("first TWAP part executes", () => twap(session));
        await step("cancel remainder", () => cancelOrders(session, [key]));
        await step("position UI", () => checkPosition(page));
        await step("close", () => changePosition(session, "close"));
      } else if (scenario.group === "orders" || scenario.id === "one-click") {
        const oneClick = scenario.id === "one-click";
        if (oneClick) {
          phase = "activate one-click";
          await session.activateOneClick();
        }
        const key = await step("create", async () => {
          const key = await createTrigger(
            session,
            !scenario.id.endsWith("short"),
            scenario.id.startsWith("stop") ? "stop-market" : "limit"
          );
          await checkOrder(page, key);
          if (oneClick) expect(await session.subaccountActive(session.active.inventory!.subaccount)).toBe(true);
          return key;
        });
        if (!oneClick)
          await step("edit", async () => {
            await editTrigger(session, key);
            await checkOrder(page, key);
          });
        await step("cancel", async () => {
          await cancelOrders(session, [key]);
          await checkOrder(page, key, false);
        });
        if (oneClick) await step("revoke", () => session.revokeOneClick());
      } else if (scenario.id === "swap") {
        const amount = await step("USDC to WETH", () => swap(session, false, 1_000_000n));
        await step("WETH to USDC", () => swap(session, true, amount));
        await step("wallet still connected after refresh", async () => {
          await page.reload();
          await expect(page.getByTestId("user-address")).toBeVisible();
        });
      } else if (scenario.id === "account" || scenario.id === "bridge") {
        await step("deposit and display", async () => {
          if (scenario.id === "bridge") await depositBridge(session);
          else await depositAccount(session);
          await checkAccount(page, true);
        });
        await step("withdraw and display", async () => {
          if (scenario.id === "bridge") await withdrawBridge(session);
          else await withdrawAccount(session);
          await checkAccount(page, false);
        });
      } else if (scenario.id === "gm" || scenario.id === "glv") {
        const kind = scenario.id;
        await step("deposit and display", async () => {
          const minted = await depositLiquidity(session, kind);
          await checkLp(page, minted.token, kind === "gm" ? "GM" : "GLV", minted.amount);
        });
        await step("withdraw", () => withdrawLiquidity(session, kind));
      } else if (scenario.id === "staking") {
        await step("stake and display", async () => {
          const amount = await stake(session);
          await checkStake(page, amount);
        });
        await step("unstake", () => unstake(session));
      } else if (scenario.id === "claims") {
        await step("claim", () => claimRewards(session));
        await step("portfolio", async () => {
          await page.goto("/earn/portfolio");
          await expect(page.getByTestId("user-address")).toBeVisible();
        });
      }
      // The next scenario starts without exposure; the global budget and initial ratio survive.
      await step("cleanup", () => session.cleanup(true, false));
      record.status = "passed";
      record.finishedAt = new Date().toISOString();
      await session.save();
    } catch (error) {
      record.status = "failed";
      record.finishedAt = new Date().toISOString();
      await session.save();
      throw new Error(`${phase}: ${fundedErrorMessage(error)}`);
    } finally {
      await testInfo.attach("funded-progress", {
        body: Buffer.from(
          JSON.stringify({
            scenario: scenario.id,
            status: record.status,
            phase,
            attempts: testInfo.retry + 1,
            actions: session.active.actions
              .filter((a) => a.step?.startsWith(`${scenario.id}:`))
              .map(({ purpose, state, feeUsd }) => ({ purpose, state, reservedFeeUsd30: feeUsd })),
          })
        ),
        contentType: "application/json",
      });
    }
  });
}
