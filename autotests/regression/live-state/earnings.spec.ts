import { expect, type Locator, type Page } from "@playwright/test";
import { getAddress } from "viem";
import { formatBalanceAmount, formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount, LiveAccounts } from "../fixtures/liveAccounts";

type Earning = { marketToken?: string; glvAddress?: string; lifetimeFeeUsd: string; recent7dFeeUsd: string };

// Earnings for the selected token from every unmodified response the page receives; they refresh while it is open.
function recordEarnings(page: Page, profile: "gm" | "glv", liveAccount: LiveAccount, liveAccounts: LiveAccounts) {
  const received: Earning[] = [];
  page.on("response", (response) => {
    if (!response.ok()) return;
    if (profile === "gm") {
      if (
        !response.url().includes("/v1/yield/gm-user-earnings") ||
        new URL(response.url()).searchParams.get("account") !== liveAccount.account
      )
        return;
    } else {
      if (response.url() !== liveAccounts.endpoint || response.request().method() !== "POST") return;
      const body = response.request().postDataJSON();
      if (!body?.query?.includes("glvUserEarnings(account:") || body?.variables?.account !== liveAccount.account)
        return;
    }
    void response.json().then(
      (data) => {
        const earnings: Earning[] = profile === "gm" ? data.pools : data.data.glvUserEarnings;
        const earning = earnings.find((e) => getAddress((e.marketToken ?? e.glvAddress)!) === liveAccount.token);
        if (earning) received.push(earning);
      },
      () => undefined
    );
  });
  return received;
}

// Polls until every field shows the values of one received response.
async function expectEarnings(received: Earning[], fields: [Locator, keyof Earning][]) {
  let matched: Earning | undefined;
  await expect
    .poll(
      async () => {
        const shown = await Promise.all(fields.map(([field]) => field.textContent()));
        matched = [...received]
          .reverse()
          .find((earning) =>
            fields.every(([, key], i) =>
              shown[i]?.replace(/\s+/g, " ").includes(formatUsd(BigInt(earning[key]!))!.replace(/\s+/g, " "))
            )
          );
        return matched ? true : { shown, received: received.length };
      },
      { timeout: 60_000 }
    )
    .toBe(true);
  return matched;
}

for (const profile of ["gm", "glv"] as const) {
  test.describe(profile.toUpperCase(), () => {
    test.use({ liveProfile: profile });
    test(`${profile === "gm" ? "13.09" : "13.10 12.23"} live ${profile.toUpperCase()}: lifetime and 7d earnings match the unmodified server response`, async ({
      page,
      liveAccount,
      liveWallet,
      liveAccounts,
    }, testInfo) => {
      const received = recordEarnings(page, profile, liveAccount, liveAccounts);
      await liveWallet.connect(page, "/earn/portfolio");
      const balance = page.getByTestId(`info-row-lp-balance-${liveAccount.token}`);
      await expect(balance).toBeVisible({ timeout: 90_000 });
      const card = balance.locator("../..");
      const earning = await expectEarnings(received, [
        [card.getByText("Lifetime", { exact: true }).locator(".."), "lifetimeFeeUsd"],
        [card.getByText("7d earnings", { exact: true }).locator(".."), "recent7dFeeUsd"],
      ]);
      await testInfo.attach("live-earnings", { body: JSON.stringify(earning), contentType: "application/json" });
    });
  });
}

test.describe("GM details", () => {
  test.use({ liveProfile: "gm" });

  test("12.17 live GM: detail page total earned fees match the unmodified earnings response", async ({
    page,
    liveAccount,
    liveWallet,
    liveAccounts,
  }, testInfo) => {
    const received = recordEarnings(page, "gm", liveAccount, liveAccounts);
    await liveWallet.connect(page, `/pools/details?market=${liveAccount.token}`);
    // Fees are attributed only while the whole balance is in the wallet; otherwise the page shows N/A.
    const balance = page.getByText("Balance", { exact: true }).locator("..");
    await expect(balance).toContainText(
      `${formatBalanceAmount(liveAccount.balance!, 18, undefined, { showZero: true })} GM`,
      { timeout: 90_000 }
    );
    const earning = await expectEarnings(received, [
      [page.getByText("Total earned fees", { exact: true }).locator(".."), "lifetimeFeeUsd"],
    ]);
    await testInfo.attach("live-gm-detail-earnings", {
      body: JSON.stringify(earning),
      contentType: "application/json",
    });
  });
});
