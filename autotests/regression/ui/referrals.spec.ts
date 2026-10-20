import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

test("15.08 referral tabs navigate between trader and affiliate onboarding", async ({ page }) => {
  await page.goto("/referrals");
  await expect(page.getByRole("heading", { name: /10% fee savings/ })).toBeVisible();
  await page.getByRole("button", { name: "Create referral code", exact: true }).click();
  await expect(page).toHaveURL(/\/referrals\/affiliates$/);
  await expect(page.getByRole("heading", { name: /Earn.*rebates/ })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/referrals\/affiliates$/);
  await page.getByRole("button", { name: "Trader benefits", exact: true }).click();
  await expect(page).toHaveURL(/\/referrals\/traders$/);
  await expect(page.getByRole("heading", { name: /10% fee savings/ })).toBeVisible();
});
