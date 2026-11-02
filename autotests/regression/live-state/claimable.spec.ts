import { expect, type Page } from "@playwright/test";
import { formatDeltaUsd, formatTokenAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";

async function openClaim(page: Page, kind: "Positive funding fees" | "Price impact rebates") {
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Claims(?:\s+\d+)?$/ })
    .click();
  const card = page.getByText("Claimable", { exact: true }).locator("..");
  const section = card.getByText(kind, { exact: true }).locator("../..");
  await expect(section.getByRole("button", { name: "Claim", exact: true })).toBeEnabled({ timeout: 45_000 });
  await section.getByRole("button", { name: "Claim", exact: true }).click();
  return page.locator(".ClaimableModal .Modal-content");
}

for (const profile of ["funding", "rebate"] as const) {
  test.describe(profile, () => {
    test.use({ liveProfile: profile });

    test(`${profile === "rebate" ? "10.06 " : ""}live ${profile}: claim review shows the discovered market and token amount without signing`, async ({
      page,
      liveAccount,
      liveWallet,
    }) => {
      await liveWallet.connect(page);
      const modal = await openClaim(page, profile === "funding" ? "Positive funding fees" : "Price impact rebates");
      const evidence = liveAccount.financial!;
      const [index, pool] = evidence.marketName!.split(" [");
      const row = modal
        .locator(".ClaimSettleModal-info-row")
        .filter({ hasText: index })
        .filter({ hasText: `[${pool}` });
      await expect(row).toBeVisible();
      await row.locator(".ClaimSettleModal-info-label-usd").hover();
      const amount = formatTokenAmount(evidence.amount, evidence.decimals, evidence.symbol, { isStable: true });
      await expect(page.getByText(amount!, { exact: true })).toBeVisible();
      await expect(modal).not.toContainText(/NaN|Infinity|undefined/);
      await modal.locator(".Modal-title").hover();
      await expect(page.getByText(amount!, { exact: true })).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
      await expect(page.getByTestId("user-address")).toBeVisible();
    });
  });
}

test.describe("funding selection", () => {
  test.use({ liveProfile: "funding" });
  test("live funding: deselecting all eligible markets blocks claim and restoring one restores selection", async ({
    page,
    liveWallet,
  }) => {
    await liveWallet.connect(page);
    const modal = await openClaim(page, "Positive funding fees");
    const selected = modal.locator(".ClaimSettleModal-checkbox.selected:enabled");
    await expect(selected.first()).toBeVisible();
    const count = await selected.count();
    for (let i = 0; i < count; i++) await selected.first().click();
    await expect(modal.getByRole("button", { name: "Select at least one market", exact: true })).toBeDisabled();
    await modal.locator(".ClaimSettleModal-checkbox:enabled").first().click();
    await expect(selected).toHaveCount(1);
    await expect(modal.getByRole("button", { name: "Select at least one market", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });
});

test.describe("accrued funding", () => {
  test.use({ liveProfile: "accrued" });
  test("10.07 live accrued funding: positive fees match the position response and appear in settle review", async ({
    page,
    liveWallet,
    liveAccount,
  }, testInfo) => {
    const responses: { pendingClaimableFundingFeesUsd: string }[][] = [];
    page.on("response", (response) => {
      if (
        response.ok() &&
        response.url().includes("/v1/positions?") &&
        new URL(response.url()).searchParams.get("address") === liveAccount.account
      )
        void response.json().then(
          (body) => responses.push(body),
          () => undefined
        );
    });
    await liveWallet.connect(page);
    await page
      .getByTestId("exchange-list-tabs")
      .getByRole("button", { name: /^Claims(?:\s+\d+)?$/ })
      .click();
    const section = page
      .getByText("Accrued", { exact: true })
      .locator("..")
      .getByText("Positive funding fees", { exact: true })
      .locator("../..");
    let total = 0n;
    // Accrued funding grows between polls, so compare with the latest response seen at each check.
    await expect
      .poll(
        async () => {
          const latest = responses.at(-1);
          if (!latest) return "waiting for a positions response";
          total = latest.reduce((sum, p) => sum + BigInt(p.pendingClaimableFundingFeesUsd), 0n);
          const shown = (await section.textContent())?.replace(/\s+/g, " ") ?? "";
          return total > 0n && shown.includes(formatDeltaUsd(total)!.replace(/\s+/g, " "))
            ? true
            : { shown, expected: formatDeltaUsd(total) };
        },
        { timeout: 45_000 }
      )
      .toBe(true);
    const positions = responses.at(-1);
    await section.getByRole("button", { name: "Settle", exact: true }).click();
    const modal = page.locator(".ClaimableModal .Modal-content");
    await expect(modal.getByText("Confirm settle", { exact: true })).toBeVisible();
    const p = liveAccount.position!;
    const row = modal
      .locator(".ClaimSettleModal-info-row")
      .filter({ hasText: `${p.isLong ? "Long" : "Short"} ${p.indexName}` })
      .filter({ hasText: `[${p.poolName}]` });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\$/);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await testInfo.attach("live-accrued-funding", {
      body: JSON.stringify({ total: String(total), positions }),
      contentType: "application/json",
    });
  });
});
