import type { Page } from "@playwright/test";
import type { FundedCase } from "./catalog";
import { checkAccount, checkOrder, checkPosition, checkStake, checkLp } from "./browser";
import { activateUiOneClick, revokeUiOneClick } from "./uiOneClick";
import { depositUiBridge, returnUiBridge, withdrawUiBridgeDust, changeUiBridgeGas } from "./uiBridge";
import { changeUiAccount } from "./uiAccount";
import { changeUiStake, claimUiRewards } from "./uiEarn";
import { swapUiTokens } from "./uiSwap";
import { changeUiLiquidity } from "./uiLiquidity";
import { createUiTwap } from "./uiTwap";
import { cancelUiOrders, createUiTrigger, editUiTrigger } from "./uiOrders";
import type { FundedSession } from "./session";
import { changeUiPosition, openUiPosition } from "./uiTrading";
import type { UiWallet } from "./uiWallet";

export type UiStep = <T>(
  name: string,
  operation: () => Promise<T>,
  verify?: (result: T) => Promise<void>
) => Promise<T>;
export const uiCaseIds = [
  "smoke-refresh",
  "market-long",
  "market-short",
  "limit-long",
  "limit-short",
  "stop-long",
  "stop-short",
  "tp-sl",
  "twap",
  "swap",
  "account",
  "staking",
  "claims",
  "one-click",
  "bridge",
  "gm",
  "glv",
] as string[];

export async function runUiJourney(
  scenario: FundedCase,
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  step: UiStep
) {
  const checked = <T>(name: string, operation: () => Promise<T>, verify: (result: T) => Promise<void>) =>
    step(name, operation, verify);
  const close = () =>
    checked(
      "close",
      async () => {
        await page
          .getByTestId("exchange-list-tabs")
          .getByRole("button", { name: /^Positions/ })
          .click();
        return changeUiPosition(session, wallet, page, "close");
      },
      () => checkPosition(page, 0n)
    );
  const cancel = (name: string, key: string, twap = false) =>
    checked(
      name,
      () => cancelUiOrders(session, wallet, page, [key], twap),
      () => checkOrder(page, key, false, twap)
    );
  if (scenario.id === "smoke-refresh" || scenario.group === "trading") {
    const isLong = scenario.id !== "market-short";
    await checked(
      "open",
      () => openUiPosition(session, wallet, page, isLong, scenario.group === "trading" ? 2 : 1),
      (opened) => checkPosition(page, opened.sizeUsd, isLong)
    );
    if (scenario.group === "trading")
      for (const operation of ["increase", "deposit", "withdraw", "partial"] as const)
        await checked(
          operation,
          () => changeUiPosition(session, wallet, page, operation),
          (size) => checkPosition(page, size, isLong)
        );
    await close();
    return;
  }
  if (scenario.id === "tp-sl") {
    await checked(
      "open",
      () => openUiPosition(session, wallet, page, true),
      (opened) => checkPosition(page, opened.sizeUsd)
    );
    for (const kind of ["take-profit", "stop-loss"] as const) {
      const key = await checked(
        `create ${kind}`,
        () => createUiTrigger(session, wallet, page, true, kind),
        (key) => checkOrder(page, key)
      );
      await checked(
        `edit ${kind}`,
        () => editUiTrigger(session, wallet, page, key),
        () => checkOrder(page, key)
      );
      await cancel(`cancel ${kind}`, key);
    }
    await close();
    return;
  }
  if (["limit-long", "limit-short", "stop-long", "stop-short"].includes(scenario.id)) {
    const key = await checked(
      "create",
      () =>
        createUiTrigger(
          session,
          wallet,
          page,
          !scenario.id.endsWith("short"),
          scenario.id.startsWith("stop") ? "stop-market" : "limit"
        ),
      (key) => checkOrder(page, key)
    );
    await checked(
      "edit",
      () => editUiTrigger(session, wallet, page, key),
      () => checkOrder(page, key)
    );
    await cancel("cancel", key);
    return;
  }
  if (scenario.id === "twap") {
    const part = await checked(
      "first TWAP part executes",
      () => createUiTwap(session, wallet, page),
      async (part) => {
        await checkOrder(page, part.key, true, true);
        await checkPosition(page, part.size);
      }
    );
    await cancel("cancel remainder", part.key, true);
    await close();
    return;
  }
  if (scenario.id === "swap") {
    const amount = await step("USDC to WETH", () => swapUiTokens(session, wallet, page, false, 1_000_000n));
    await checked(
      "WETH to USDC",
      () => swapUiTokens(session, wallet, page, true, amount),
      () => checkPosition(page, 0n)
    );
    return;
  }
  if (scenario.id === "account") {
    await checked(
      "deposit",
      () => changeUiAccount(session, wallet, page, false),
      () => checkAccount(page, true)
    );
    await checked(
      "withdraw",
      () => changeUiAccount(session, wallet, page, true),
      () => checkAccount(page, false)
    );
    return;
  }
  if (scenario.id === "staking") {
    await checked(
      "stake",
      () => changeUiStake(session, wallet, page, false),
      (amount) => checkStake(page, amount)
    );
    await checked(
      "unstake",
      () => changeUiStake(session, wallet, page, true),
      () => checkStake(page, 0n)
    );
    return;
  }
  if (scenario.id === "one-click") {
    await step("activate", () => activateUiOneClick(session, wallet, page));
    const key = await checked(
      "create",
      () => createUiTrigger(session, wallet, page, true, "limit"),
      (key) => checkOrder(page, key)
    );
    await cancel("cancel", key);
    await step("revoke", () => revokeUiOneClick(session, wallet, page));
    return;
  }
  if (scenario.id === "bridge") {
    await checked(
      "Base deposit",
      () => depositUiBridge(session, wallet, page),
      () => checkAccount(page, true)
    );
    await step("deposit bridge gas", () => changeUiBridgeGas(session, wallet, page, false));
    await step("Base withdrawal", () => returnUiBridge(session, wallet, page));
    await step("withdraw remaining account fees", () => withdrawUiBridgeDust(session, wallet, page));
    await checked(
      "withdraw unused bridge gas",
      () => changeUiBridgeGas(session, wallet, page, true),
      () => checkAccount(page, false)
    );
    return;
  }
  if (scenario.id === "gm" || scenario.id === "glv") {
    const kind = scenario.id;
    await checked(
      "deposit",
      () => changeUiLiquidity(session, wallet, page, kind, false),
      (lp) => checkLp(page, lp.token, kind === "gm" ? "GM" : "GLV", lp.amount)
    );
    await step("withdraw", () => changeUiLiquidity(session, wallet, page, kind, true));
    return;
  }
  if (scenario.id === "claims") {
    await checked(
      "claim",
      () => claimUiRewards(session, wallet, page),
      async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    );
    return;
  }
  throw new Error(`No UI driver for ${scenario.id}`);
}
