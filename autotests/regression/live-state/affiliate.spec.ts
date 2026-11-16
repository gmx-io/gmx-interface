import { expect, type Page, type Response } from "@playwright/test";
import { getAddress, hexToString, parseAbi, type Hex } from "viem";
import { CONTRACTS_CHAIN_IDS, getChainName, getChainSlug } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import { formatBigUsd, formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount, LiveAccounts } from "../fixtures/liveAccounts";
import { openTooltip } from "../fixtures/marketData";

test.use({ liveProfile: "affiliate" });

type CodeStat = {
  referralCode: Hex;
  volume: string;
  registeredReferralsCount: string;
  totalRebateUsd: string;
  discountUsd: string;
  v1Data: { volume: string; totalRebateUsd: string; discountUsd: string };
  v2Data: { volume: string; totalRebateUsd: string; discountUsd: string };
};

const graphql = (response: Response) => {
  if (!response.ok() || response.request().method() !== "POST") return undefined;
  try {
    return response.request().postDataJSON() as { query?: string; variables?: Record<string, unknown> };
  } catch {
    return undefined;
  }
};

const referralsUrl = (chainId: number) => `-${getChainSlug(chainId)}-referrals/`;

// affiliateStats arrive in dashboard row order.
async function openDashboard(page: Page, liveAccount: LiveAccount, chainId: number) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(referralsUrl(chainId)) &&
      !!graphql(response)?.query?.includes("query referralData(") &&
      getAddress(String(graphql(response)?.variables?.account)) === liveAccount.account,
    { timeout: 60_000 }
  );
  await page.goto(`/referrals/affiliates/${liveAccount.account}`, { waitUntil: "domcontentloaded" });
  const { data } = (await (await responsePromise).json()) as {
    data: { affiliateStats: CodeStat[]; referralCodes: { code: Hex }[] };
  };
  const owned = new Set(data.referralCodes.map((c) => c.code));
  const stats = data.affiliateStats.filter((s) => owned.has(s.referralCode));
  expect(stats.length, "The affiliate has indexed code statistics on this chain").toBeGreaterThan(0);
  const table = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "REFERRAL CODE", exact: true }) });
  await expect(table.locator("tbody tr").first()).toBeVisible({ timeout: 60_000 });
  return { stats, table };
}

async function readTier(liveAccounts: LiveAccounts, account: LiveAccount["account"]) {
  const storage = {
    address: getAddress(getContract(liveAccounts.chainId, "ReferralStorage")),
    abi: parseAbi([
      "function referrerTiers(address) view returns (uint256)",
      "function referrerDiscountShares(address) view returns (uint256)",
      "function tiers(uint256) view returns (uint256 totalRebate, uint256 discountShare)",
    ]),
  } as const;
  const [tier, custom] = await liveAccounts.rpc.multicall({
    contracts: [
      { ...storage, functionName: "referrerTiers", args: [account] },
      { ...storage, functionName: "referrerDiscountShares", args: [account] },
    ],
    allowFailure: false,
  });
  const [totalRebate, tierShare] = await liveAccounts.rpc.readContract({
    ...storage,
    functionName: "tiers",
    args: [tier],
  });
  const share = custom > 0n ? custom : tierShare;
  const percent = (bps: bigint) => String(Number((Number(totalRebate * bps) / 1e6).toFixed(3)));
  return { tier, totalRebate, share, rebate: percent(10_000n - share), discount: percent(share) };
}

test("15.10 live affiliate: overview stats match the unmodified indexer response and the tier matches ReferralStorage", async ({
  page,
  liveAccount,
  liveAccounts,
  chainId,
}, testInfo) => {
  const statsPromise = page.waitForResponse(
    (response) => {
      const body = graphql(response);
      const where = body?.variables?.where as { affiliate?: string; from?: number } | undefined;
      return (
        response.url() === liveAccounts.endpoint &&
        !!body?.query?.includes("query AffiliateStats(") &&
        !!where?.affiliate &&
        getAddress(where.affiliate) === liveAccount.account &&
        where.from === 0
      );
    },
    { timeout: 60_000 }
  );
  await openDashboard(page, liveAccount, chainId);
  const { summary } = (
    (await (await statsPromise).json()) as {
      data: {
        affiliateStats: { summary: { volumeUsd: string; tradesCount: number; tradersNet: number; rebatesUsd: string } };
      };
    }
  ).data.affiliateStats;
  const card = (label: string) =>
    page
      .getByText(label, { exact: true })
      .first()
      .locator(
        "xpath=ancestor::div[contains(concat(' ', @class, ' '), ' text-body-small ')][1]/following-sibling::div[1]"
      )
      .locator(".text-24");
  await expect(card("Trading volume")).toHaveText(formatBigUsd(BigInt(summary.volumeUsd)));
  await expect(card("Number of trades from referrals")).toHaveText(String(summary.tradesCount));
  await expect(card("Traders referred")).toHaveText(String(summary.tradersNet));
  await expect(card("Rebates")).toHaveText(formatUsd(BigInt(summary.rebatesUsd))!);
  const tier = await readTier(liveAccounts, liveAccount.account);
  await expect(page.getByText(/^Tier \d+: .*% rebate$/)).toHaveText(`Tier ${tier.tier + 1n}: ${tier.rebate}% rebate`);
  await testInfo.attach("live-affiliate-overview", {
    body: JSON.stringify({ summary, tier }, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    contentType: "application/json",
  });
});

test("15.11 15.13 live affiliate: top code volume, traders, rebates and discounts match the unmodified indexer response", async ({
  page,
  liveAccount,
  liveAccounts,
  chainId,
}, testInfo) => {
  const { stats, table } = await openDashboard(page, liveAccount, chainId);
  const top = stats[0];
  const code = hexToString(top.referralCode, { size: 32 });
  const row = table.locator("tbody tr").first();
  const cells = row.getByRole("cell");
  const rebate = (data: { totalRebateUsd: string; discountUsd: string }) =>
    BigInt(data.totalRebateUsd) - BigInt(data.discountUsd);
  await expect(cells.nth(0)).toContainText(code);
  await expect(cells.nth(1)).toHaveText(formatBigUsd(BigInt(top.volume)));
  await expect(cells.nth(2)).toHaveText(top.registeredReferralsCount);
  await expect(cells.nth(3)).toHaveText(formatBigUsd(rebate(top)));

  const tooltipRow = (label: string) => page.getByText(label, { exact: true }).locator("..");
  await openTooltip(page, cells.nth(1).locator(".numbers").first(), "V1 volume:");
  await expect(tooltipRow("V1 volume:")).toContainText(formatBigUsd(BigInt(top.v1Data.volume)));
  await expect(tooltipRow("V2 volume:")).toContainText(formatBigUsd(BigInt(top.v2Data.volume)));
  await openTooltip(page, cells.nth(3).locator(".numbers").first(), "V1 rebates:");
  await expect(tooltipRow("V1 rebates:")).toContainText(formatUsd(rebate(top.v1Data), { fallbackToZero: true })!);
  await expect(tooltipRow("V2 rebates:")).toContainText(formatUsd(rebate(top.v2Data), { fallbackToZero: true })!);

  // The discounts line appears only above $100.
  const tier = await readTier(liveAccounts, liveAccount.account);
  await row.getByRole("button", { name: "Share", exact: true }).click();
  const share = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Share your referral card", { exact: true }) });
  test.fail(tier.discount === "0", "PRO-4494: a share that rounds to zero reads as 0.000% until #3108 lands");
  await expect(share).toContainText(`Save up to ${tier.discount}% on every`);
  const discounts = share.getByText(/^So far, my referrals have saved/);
  if (BigInt(top.discountUsd) >= 100n * 10n ** 30n)
    await expect(discounts).toHaveText(
      `So far, my referrals have saved ${formatUsd(BigInt(top.discountUsd))} total in discounts with my code: ${code}`
    );
  else await expect(discounts).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(share).toBeHidden();
  await testInfo.attach("live-affiliate-code", {
    body: JSON.stringify({ code, top, tier }, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    contentType: "application/json",
  });
});

// Recently registered codes are often missing on other chains, so this uses the newest code owners.
test.describe("other chains", () => {
  test.use({ liveProfile: "referral" });

  test("15.05 live referral codes: other-chain registration warnings match each chain's referral indexer", async ({
    page,
    liveAccount,
    chainId,
  }, testInfo) => {
    const owners: Promise<{ chainId: number; requested: number; codes: { id: Hex; owner: string }[] }>[] = [];
    page.on("response", (response) => {
      const body = graphql(response);
      const other = CONTRACTS_CHAIN_IDS.find((id) => id !== chainId && response.url().includes(referralsUrl(id)));
      if (other && body?.query?.includes("query allCodes("))
        owners.push(
          response.json().then((r: { data: { referralCodes: { id: Hex; owner: string }[] } }) => ({
            chainId: other,
            requested: (body.variables?.codes as string[]).length,
            codes: r.data.referralCodes,
          }))
        );
    });
    const { stats, table } = await openDashboard(page, liveAccount, chainId);
    const chains = [...new Map((await Promise.all(owners)).map((c) => [c.chainId, c])).values()];
    expect(chains.length, "Other chains answered the code-ownership query").toBeGreaterThan(0);
    // The indexer returns at most 100 rows without an explicit page size; a full page may hide owned codes.
    for (const c of chains)
      expect(
        c.codes.length < 100 || c.requested <= 100,
        `${getChainName(c.chainId)} ownership covers all ${c.requested} codes (unpaged indexer queries stop at 100 rows)`
      ).toBe(true);
    const evidence: unknown[] = [];
    const rows = table.locator("tbody tr");
    for (let i = 0; i < Math.min(await rows.count(), stats.length); i++) {
      const code = stats[i].referralCode;
      const owner = (c: (typeof chains)[number]) => c.codes.find((item) => item.id === code)?.owner;
      const missing = chains.filter((c) => !owner(c)).map((c) => getChainName(c.chainId));
      const taken = chains
        .filter((c) => owner(c) && getAddress(owner(c)!) !== liveAccount.account)
        .map((c) => getChainName(c.chainId));
      const row = rows.nth(i);
      await expect(row.getByRole("cell").first()).toContainText(hexToString(code, { size: 32 }));
      const icon = row.getByRole("cell").first().locator(".info svg");
      evidence.push({ code, missing, taken });
      if (!missing.length && !taken.length) {
        await expect(icon).toHaveCount(0);
        continue;
      }
      const notRegistered = page.getByText(/^Code not registered on:/);
      const alreadyTaken = page.getByText(/^Code already taken on:/);
      await openTooltip(page, icon, /Code (not registered|already taken) on:/);
      if (missing.length) for (const name of missing) await expect(notRegistered).toContainText(name);
      else await expect(notRegistered).toHaveCount(0);
      if (taken.length) for (const name of taken) await expect(alreadyTaken).toContainText(name);
      else await expect(alreadyTaken).toHaveCount(0);
      await page.getByText("Referral codes", { exact: true }).hover();
      await expect(notRegistered.or(alreadyTaken).first()).toBeHidden();
    }
    await testInfo.attach("live-affiliate-other-chains", {
      body: JSON.stringify({ chains, evidence }),
      contentType: "application/json",
    });
  });
});
