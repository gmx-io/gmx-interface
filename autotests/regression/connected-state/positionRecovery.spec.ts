import { expect } from "@playwright/test";

import type { ApiPositionInfo } from "../../../sdk/src/utils/positions/types";
import { test } from "../fixtures/accountState";
import { configureClassicTrading, fillCollateralEdit, fundedPositionRow } from "../fixtures/tradingForms";

for (const { title, reopened, survives } of [
  {
    title: "margin input survives a temporary gap in position data",
    reopened: (position: ApiPositionInfo) => position,
    survives: true,
  },
  {
    title: "a position closed and reopened under the open editor starts with an empty margin input",
    // The same key comes back as a new position, opened after the old one closed.
    reopened: (position: ApiPositionInfo) => ({ ...position, increasedAtTime: position.increasedAtTime + 60n }),
    survives: false,
  },
]) {
  test(`8.09 ${title}`, async ({ page, accountState }) => {
    const position = accountState.data.position(false);
    accountState.positions = [position];
    accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
    await accountState.connect(page);
    await configureClassicTrading(page);
    await fillCollateralEdit(page, false, "Deposit", "0.25");
    const modal = page.getByTestId("position-edit-modal");
    accountState.positions = [];
    await expect(modal).toBeHidden();
    accountState.positions = [reopened(position)];
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("amount-input-input")).toHaveValue(survives ? "0.25" : "");
    if (!survives) return;
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await fundedPositionRow(page, false).getByTestId("position-edit-button").click();
    await expect(modal.getByTestId("amount-input-input")).toHaveValue("");
  });
}
