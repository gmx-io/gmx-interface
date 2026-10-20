import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { test } from "../fixtures/accountState";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { fundedCases } from "./catalog";
import { runUiJourney } from "./uiJourneys";
import { createUiRehearsal } from "./uiRehearsal";
import { openFundedTradePage } from "./browser";
import { restoreUiBrowserState, saveUiBrowserState } from "./uiBrowserState";

test.use({ walletReviewMode: true, unsignedReviewMode: true, signableRehearsal: true });
for (const scenario of fundedCases) {
  test(`UI funded rehearsal without funds: ${scenario.id}`, async ({
    page,
    context,
    accountState,
    chainId,
  }, testInfo) => {
    test.skip(chainId !== 42161, "Funded UI driver supports Arbitrum");
    test.setTimeout(600_000);
    const { session, wallet, journal } = await createUiRehearsal(context, accountState);
    await accountState.connect(page);
    await configureClassicTrading(page);
    const directory = await mkdtemp(join(tmpdir(), "gmx-ui-rehearsal-"));
    Object.assign(session, { directory });
    try {
      await runUiJourney(scenario, session, wallet, page, async (name, operation, verify) => {
        const id = `${scenario.id}:${name}`;
        const result = await session.step(id, async () => {
          const value = await operation();
          await verify?.(value);
          return value;
        });
        delete journal.checkpoints![id].finishedAt;
        const count = journal.actions.length;
        const resumed: unknown = await session.step(id, operation);
        expect(resumed).toEqual(result);
        expect(journal.actions).toHaveLength(count);
        if (scenario.id === "one-click" && name === "create") {
          const origin = page.url();
          await saveUiBrowserState(session, context, origin);
          await page
            .evaluate(() =>
              (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum.request({
                method: "wallet_revokePermissions",
                params: [{ eth_accounts: {} }],
              })
            )
            .catch((error: Error) => {
              if (!error.message.includes("Execution context was destroyed")) throw error;
            });
          // Revoking can reload the app, which then stores its disconnected state; clear storage after that.
          await page.waitForLoadState();
          await context.clearCookies();
          await expect(async () => {
            await page.evaluate(() => {
              localStorage.clear();
              sessionStorage.clear();
            });
          }).toPass({ timeout: 15_000 });
          await page.goto("about:blank");
          expect(await restoreUiBrowserState(session, page, origin)).toBe(true);
          await openFundedTradePage(page, session.address);
        }
        return result;
      });
      const settledCount = journal.actions.length;
      await runUiJourney(scenario, session, wallet, page, (name, operation) =>
        session.step(`${scenario.id}:${name}`, operation)
      );
      expect(journal.actions).toHaveLength(settledCount);
      expect(accountState.positions).toHaveLength(0);
      expect(accountState.orders).toHaveLength(0);
      if (scenario.id === "staking") expect(journal.inventory?.uiStakeResetAcknowledged).toBe("true");
      expect(journal.actions.every((a) => a.purpose.startsWith("ui:"))).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    await testInfo.attach("simulated-funded-ui-journal", {
      body: JSON.stringify(journal),
      contentType: "application/json",
    });
  });
}
