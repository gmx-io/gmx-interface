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

test("8.09 a position closed and reopened under the open editor starts with an empty margin input", async ({
  page,
  accountState,
}) => {
  const position = accountState.data.position(false);
  accountState.positions = [position];
  accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
  await accountState.connect(page);
  await configureClassicTrading(page);
  await fillCollateralEdit(page, false, "Deposit", "0.25");
  const modal = page.getByTestId("position-edit-modal");
  accountState.positions = [];
  await expect(modal).toBeHidden();
  // The same key comes back as a new position, opened after the old one closed.
  accountState.positions = [{ ...position, increasedAtTime: position.increasedAtTime + 60n }];
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId("amount-input-input")).toHaveValue("");
});
