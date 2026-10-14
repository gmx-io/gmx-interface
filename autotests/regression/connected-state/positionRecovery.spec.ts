import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { configureClassicTrading, fillCollateralEdit, fundedPositionRow } from "../fixtures/tradingForms";

test("8.09 margin input survives a temporary gap in position data", async ({ page, accountState }) => {
  const position = accountState.data.position(false);
  accountState.positions = [position];
  accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
  await accountState.connect(page);
  await configureClassicTrading(page);
  await fillCollateralEdit(page, false, "Deposit", "0.25");
  const modal = page.getByTestId("position-edit-modal");
  accountState.positions = [];
  await expect(modal).toBeHidden();
  accountState.positions = [position];
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId("amount-input-input")).toHaveValue("0.25");
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await fundedPositionRow(page, false).getByTestId("position-edit-button").click();
  await expect(modal.getByTestId("amount-input-input")).toHaveValue("");
});
