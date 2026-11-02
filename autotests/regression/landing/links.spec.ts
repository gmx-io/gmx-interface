import { expect } from "@playwright/test";

import { displayedNumber } from "../fixtures/displayedNumber";
import { test } from "../fixtures/landing";

test("2.38 landing liquidity totals and GM/GLV rewards are positive", async ({ page }) => {
  await page.goto("/");
  const liquidity = page.getByRole("heading", { name: /[\d, ]+ in liquidity/ });
  const users = page.getByRole("heading", { name: /Join [\d,]+ users earning real yield/ });
  await expect.poll(async () => displayedNumber((await liquidity.innerText()).replaceAll(" ", ""))).toBeGreaterThan(0);
  await expect.poll(async () => displayedNumber(await users.innerText())).toBeGreaterThan(0);
  await expect(page.getByText("Accumulating...", { exact: true })).toBeVisible();
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: /in liquidity/ }) });
  const aprs = section.getByText(/[\d.]+%\s*APR/);
  await expect(aprs).toHaveCount(2);
  for (const apr of await aprs.allInnerTexts()) expect(displayedNumber(apr), apr).toBeGreaterThan(0);
});

test("2.37 Total volume opens the GMX Dune dashboard", async ({ page, context }) => {
  await page.goto("/");
  const opened = context.waitForEvent("page");
  await page.getByText("Total volume", { exact: true }).click();
  const popup = await opened;
  await expect(popup).toHaveURL(/^https:\/\/dune.com\/gmx-io\/gmx-analytics/);
  await popup.close();
});

for (const label of ["GMX", "GLV", "GM", "Start earning"]) {
  test(`2.41 landing ${label} opens the corresponding earning page`, async ({ page }) => {
    await page.goto("/");
    if (label === "Start earning") {
      await page.getByRole("button", { name: label, exact: true }).click();
    } else {
      await page.getByRole("heading", { name: label, exact: true }).click();
    }
    await expect(page).toHaveURL(/\/earn(?:\/|\?|$)/);
    await expect(page.getByRole("heading", { name: /Earn/ }).first()).toBeVisible();
  });
}

for (const mobile of [false, true]) {
  test(`2.44 landing ${mobile ? "mobile menu" : "desktop header"} exposes protocol and community destinations`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const header = page.locator("[data-landing-header]");
    if (mobile) await header.getByRole("button", { name: "", exact: true }).click();
    for (const [label, url] of [
      ["Protocol", "https://github.com/gmx-io"],
      ["Governance", "https://gov.gmx.io/"],
      ["Voting", "https://snapshot.org/#/gmx.eth"],
      ["Docs", "https://docs.gmx.io/"],
    ]) {
      const link = header.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", url);
    }
    if (mobile) {
      await header.getByRole("button", { name: "", exact: true }).first().click();
      await expect(header.getByRole("link", { name: "Protocol", exact: true })).toBeHidden();
    }
  });
}

test("2.46 footer Media kit opens the community media kit in a new tab", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Media kit", exact: true });
  await expect(link).toHaveAttribute("href", "https://docs.gmx.io/docs/community/#media-kit");
  await expect(link).toHaveAttribute("target", "_blank");
});

for (const [label, path] of [
  ["Referral terms", "/referral-terms"],
  ["Terms and conditions", "/terms-and-conditions"],
]) {
  test(`2.46 footer ${label} opens its own content in a new tab`, async ({ page, context }) => {
    await page.goto("/");
    const opened = context.waitForEvent("page");
    await page.getByRole("link", { name: label, exact: true }).click();
    const popup = await opened;
    await expect(popup).toHaveURL(new RegExp(`${path}$`));
    await expect(popup).toHaveTitle(new RegExp(label, "i"));
    await expect(
      popup
        .getByText(path === "/referral-terms" ? "GMX Referral Program" : "Terms and Conditions", { exact: true })
        .first()
    ).toBeVisible();
    await popup.close();
  });
}
