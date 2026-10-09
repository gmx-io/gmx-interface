import type { Page, BrowserContext } from "@playwright/test";
import { runFundedPlaywright } from "./playwright";

import { checkAccount, connectFundedWallet } from "./browser";
import type { FundedCase } from "./catalog";
import type { FundedSession } from "./session";
import { validateFundedTarget } from "./target";

export async function checkFundedDeployment(
  page: Page,
  context: BrowserContext,
  session: Pick<FundedSession, "address" | "rpc">,
  selected: readonly FundedCase[]
) {
  validateFundedTarget(process.env.REGRESSION_BASE_URL);
  const scripts: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.push(response.text().catch(() => ""));
  });
  await connectFundedWallet(page, context, session);
  const portfolio = selected.some((c) => ["gm", "glv", "staking", "claims"].includes(c.id));
  if (portfolio) {
    await page.goto("/earn/portfolio");
    await page.getByTestId("user-address").waitFor();
  }
  const source = (await Promise.all(scripts)).join("\n");
  const missing = missingFundedSelectors(source, selected);
  if (missing.length)
    throw new Error(
      `Deployment lacks funded selectors: ${missing.join(", ")}; deploy the current PR changes before spending`
    );
  if (selected.some((c) => c.id === "account" || c.id === "bridge")) await checkAccount(page, false);
  return {
    connected: true,
    restoredAfterRefresh: true,
    selectedCases: selected.map((c) => c.id),
    transactionsSubmitted: 0,
  };
}

export async function verifyFundedDeployment(
  session: Pick<FundedSession, "address" | "rpcUrl">,
  selected: readonly FundedCase[]
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    REGRESSION_FUNDED_ADDRESS: session.address,
    REGRESSION_RPC_URL: session.rpcUrl,
    REGRESSION_FUNDED_CASES: selected.map((c) => c.id).join(","),
  };
  delete env.REGRESSION_PRIVATE_KEY;
  delete env.GMX_TEST_PRIVATE_KEY;
  delete env.REGRESSION_FUNDED_EXECUTE;
  const code = await runFundedPlaywright("playwright-funded-deployment.config.ts", env);
  if (code !== 0)
    throw new Error("Deployment preflight failed before spending; see playwright-report/funded-deployment");
}

export function missingFundedSelectors(source: string, selected: readonly FundedCase[]) {
  const required: string[] = [];
  if (selected.some((c) => c.id === "account" || c.id === "bridge")) required.push("gmx-account-balance");
  if (selected.some((c) => c.id === "gm" || c.id === "glv")) required.push("lp-balance-");
  if (selected.some((c) => c.id === "staking")) required.push("staked-gmx");
  const missing = required.filter((marker) => !source.includes(marker));
  if (
    selected.some((c) => c.group === "orders" || c.id === "one-click") &&
    !/["']data-qa["']\s*:\s*(?:`order-\$\{|["']order-["']\s*\+)/.test(source)
  )
    missing.push("order rows");
  return missing;
}
