import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

test("15.08 referral tabs navigate between trader and affiliate onboarding", async ({ page }) => {
  await page.goto("/referrals");
  const content = page;
  await expect(content.getByRole("heading", { name: /10% fee savings/ })).toBeVisible();
  await content.getByRole("button", { name: "Create Referral Code", exact: true }).click();
  await expect(page).toHaveURL(/\/referrals\/affiliates$/);
  await expect(content.getByRole("heading", { name: /Earn.*rebates/ })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/referrals\/affiliates$/);
  await content.getByRole("button", { name: "Trader Benefits", exact: true }).click();
  await expect(page).toHaveURL(/\/referrals\/traders$/);
  await expect(content.getByRole("heading", { name: /10% fee savings/ })).toBeVisible();
});

test("referral FAQ expands its answer and collapses it", async ({ page }) => {
  await page.goto("/referrals/traders");
  const question = page.getByRole("button", { name: "Why should I enter a referral code?", exact: true });
  const answer = page.getByText(/Using a referral code gives you a 5-10% discount/);
  await question.click();
  await expect(answer).toBeVisible();
  await question.click();
  await expect(answer).toBeHidden();
});

test("15.08 referral distributions redirect to affiliate onboarding without a registered code", async ({ page }) => {
  await page.goto("/referrals/distributions");
  await expect(page).toHaveURL(/\/referrals\/affiliates$/);
  await expect(page.getByRole("button", { name: "Distributions", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: /Earn.*rebates/ })).toBeVisible();
});
