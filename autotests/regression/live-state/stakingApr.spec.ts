import { expect } from "@playwright/test";

import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import { infoRowValue } from "../fixtures/marketData";

type StakingPower = { cumulativePower: string; totalNetworkPower: string; currentStaked: string };
type BuybackWeeks = { weeks: { weekStart: number; weekEnd: number; weeklyAccrued: string }[] };

test.use({ liveProfile: "staking" });

// Same formula as the app: recent weekly buyback x 52 x staking power share / staked GMX + esGMX.
function expectedApr(power: StakingPower, buyback: BuybackWeeks) {
  const weeks = buyback.weeks
    .filter((week) => week.weekEnd - week.weekStart >= 7 * 86_400 && BigInt(week.weeklyAccrued) > 0n)
    .slice(-4);
  const [userPower, networkPower, staked] = [power.cumulativePower, power.totalNetworkPower, power.currentStaked].map(
    (value) => Number(value) / 1e18
  );
  if (weeks.length < 4 || !(userPower > 0) || !(networkPower > 0) || !(staked > 0)) return undefined;
  const weeklyGmx = weeks.reduce((sum, week) => sum + Number(week.weeklyAccrued) / 1e18, 0) / weeks.length;
  return (weeklyGmx * 52 * (userPower / networkPower)) / staked;
}

test("2.31 13.12 Earn GMX card shows the on-chain staked balance, also after refresh, and the Est. APR derived from the staking power and buyback responses, positive and at most 100% where buybacks accrue", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  let power: StakingPower | undefined;
  let buyback: BuybackWeeks | undefined;
  page.on("response", async (response) => {
    const path = new URL(response.url()).pathname;
    if (!response.ok() || !/^\/v1\/(staking\/power|buyback\/weekly-stats)$/.test(path)) return;
    const json = await response.json().catch(() => undefined);
    if (path.endsWith("/power") && json?.cumulativePower !== undefined) power = json;
    if (path.endsWith("/weekly-stats") && Array.isArray(json?.weeks)) buyback = json;
  });
  await liveWallet.connect(page, "/earn/portfolio");
  const staked = page.getByTestId("info-row-staked-gmx");
  const amount = formatBalanceAmount(liveAccount.staking!.gmx, 18, "GMX", { showZero: true });
  await expect(staked).toContainText(amount, { timeout: 45_000 });
  const card = page.locator("div").filter({ has: staked }).filter({ hasText: "Est. APR" }).last();
  const apr = infoRowValue(card, "Est. APR");
  await expect
    .poll(
      async () => {
        if (!power || !buyback) return "waiting for staking power and buyback responses";
        const expected = expectedApr(power, buyback);
        const shown = (await apr.innerText()).trim();
        return shown === (expected === undefined ? "—" : `${(expected * 100).toFixed(2)}%`) ? "match" : shown;
      },
      { timeout: 45_000 }
    )
    .toBe("match");
  // Avalanche has no buybacks, so its card shows "—" and there is no APR to bound.
  if (buyback!.weeks.some((week) => BigInt(week.weeklyAccrued) > 0n)) {
    const expected = expectedApr(power!, buyback!);
    expect(expected !== undefined && expected > 0 && expected <= 1, `Est. APR ${expected}`).toBe(true);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  await expect(staked).toContainText(amount, { timeout: 45_000 });
});
