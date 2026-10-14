import { test } from "@playwright/test";

import { openFundedTradePage } from "./browser";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { UiWallet } from "./uiWallet";
import { runUiJourney } from "./uiJourneys";
import { selectedCasesFromEnvironment } from "./catalog";
import { fundedErrorMessage } from "./errors";
import { FundedSession } from "./session";
import { restoreUiBrowserState, saveUiBrowserState } from "./uiBrowserState";

for (const scenario of selectedCasesFromEnvironment()) {
  test(`@${scenario.group} ${scenario.id}: ${scenario.title}`, async ({ page, context }, testInfo) => {
    test.setTimeout(scenario.id === "bridge" ? 1_500_000 : 600_000);
    const session = new FundedSession();
    await session.resume(process.env.REGRESSION_FUNDED_RUN_ID);
    const scenarios = (session.active.scenarios ??= {});
    const record = (scenarios[scenario.id] ??= { startedAt: new Date().toISOString(), status: "running" });
    const wallet = new UiWallet(session);
    let phase = "connect guarded UI wallet";
    const step = <T>(name: string, action: () => Promise<T>, verify?: (result: T) => Promise<void>) =>
      test.step(name, () => {
        phase = name;
        return session.step(`${scenario.id}:${name}`, async () => {
          try {
            const result = await action();
            await verify?.(result);
            return result;
          } finally {
            await saveUiBrowserState(session, context, process.env.REGRESSION_BASE_URL!);
          }
        });
      });
    try {
      const failedAction = session.active.actions.find(
        (action) => action.step?.startsWith(`${scenario.id}:`) && action.state === "failed" && action.failureReason
      );
      if (failedAction) {
        phase = "previous funded action";
        throw new Error(failedAction.failureReason);
      }
      await test.step(phase, async () => {
        await wallet.install(context, process.env.REGRESSION_BASE_URL!);
        const restored = await restoreUiBrowserState(session, page, process.env.REGRESSION_BASE_URL!);
        await openFundedTradePage(page, session.address);
        if (!restored) await configureClassicTrading(page);
      });
      await runUiJourney(scenario, session, wallet, page, step);
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
            actionDriver: "browser UI",
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
