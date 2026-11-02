import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

for (const path of ["/trade", "/pools", "/earn/discover", "/referrals", "/announcements"]) {
  const title =
    path === "/trade"
      ? "1.10 1.12 2.36 mobile /trade has no sideways scrolling at phone width and a usable tradebox"
      : `1.10 2.36 mobile ${path} has no sideways scrolling at phone width`;
  test(title, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    if (path === "/trade") {
      await page.getByTestId("trade-direction").getByRole("button", { name: "Long", exact: true }).click();
      await expect(page.getByTestId("margin-input")).toBeInViewport();
      await page.getByTestId("margin-input").fill("100");
      await expect(page.getByTestId("position-size-input")).not.toHaveValue("");
    } else if (path === "/pools") {
      await expect(page.getByRole("link", { name: "View details", exact: true }).first()).toBeVisible();
      await page.getByRole("link", { name: "View details", exact: true }).first().click();
      await expect(page).toHaveURL(/\/pools\/details\?market=/);
    } else {
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });
}
