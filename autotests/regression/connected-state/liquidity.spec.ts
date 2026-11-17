import { expect } from "@playwright/test";
import { zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { chooseMode, inputNumber } from "../fixtures/trade";

for (const type of ["GM", "GLV"] as const) {
  test(`12.24 12.26 ${type} forms reject deposits and withdrawals exceeding mocked balances`, async ({
    page,
    accountState,
  }) => {
    accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
    accountState.balances.set(zeroAddress, 10n ** 18n);
    await accountState.connect(page, "/pools");
    await chooseMode(page, "Classic");
    const table = page.getByRole("table").filter({
      has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }),
    });
    await table.getByRole("link", { name: "Details", exact: true }).first().click();
    await page.getByRole("button", { name: `Buy ${type}`, exact: true }).click();
    const form = page.locator("form").filter({ has: page.getByTestId("gm-first-token-input") });
    const submit = form.locator('button[type="submit"]');
    await page.getByTestId("gm-first-token-input").fill("1000000000");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(/Insufficient .*balance|Max .*amount exceeded/);
    await page.getByRole("button", { name: `Sell ${type}`, exact: true }).click();
    const amount = form.getByRole("textbox").last();
    await amount.fill("1");
    await expect.poll(() => inputNumber(amount)).toBe(1);
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(/Insufficient .*balance/);
    await amount.clear();
    await expect(submit).toHaveText("Enter an amount");
  });
}
