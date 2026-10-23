import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";

test("15.02 fresh account rejects a malformed or nonexistent referral code and recovers after clearing it", async ({
  page,
  accountState,
}) => {
  await accountState.connect(page, "/referrals");
  const input = page.getByPlaceholder("Enter referral code", { exact: true });
  await expect(input).toBeVisible();
  const form = input.locator("xpath=ancestor::form");
  await expect(form.getByRole("button")).toBeDisabled();
  for (const code of ["invalid code!", "REGRESSION_NO_CODE_20261008"]) {
    await input.fill(code);
    await expect(form.getByRole("button")).toHaveText("Code not found");
    await expect(form.getByRole("button")).toBeDisabled();
  }
  await input.clear();
  await expect(form.getByRole("button")).toHaveText("Enter referral code");
  await expect(form.getByRole("button")).toBeDisabled();
});
