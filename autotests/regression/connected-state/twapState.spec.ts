import { expect } from "@playwright/test";
import { maxUint256 } from "viem";

import { encodeOrderDataListMetadata } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import { test } from "../fixtures/accountState";

for (const isLong of [true, false]) {
  test(`6.17 6.18 6.21 6.22 9.04 mocked ${isLong ? "Long" : "Short"} TWAP groups its parts and reflects polling progress`, async ({
    page,
    accountState,
  }) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    accountState.orders = [0, 1, 2].map((index) => ({
      ...accountState.data.order(3, isLong, 100 + index),
      triggerPrice: isLong ? maxUint256 : 0n,
      acceptablePrice: isLong ? maxUint256 : 0n,
      updatedAtTime: now,
      validFromTime: now + BigInt(index * 60),
      dataList: [encodeOrderDataListMetadata({ numberOfParts: 3, twapId: "1234" })],
    }));
    await accountState.connect(page);
    const table = page.getByTestId("trade-table-large");
    await table.getByRole("button", { name: /^Orders/ }).click();
    const row = table.locator('tr[data-qa^="order-"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`TWAP`);
    await expect(row).toContainText(isLong ? "Long" : "Short");
    await expect(row).toContainText("(0/3)");
    await expect(row).toContainText(/3,000\.00/);
    await row.getByText(/\(0\/3\)/).hover();
    await expect(page.getByText("Pending", { exact: true })).toHaveCount(3);
    await page.getByRole("banner").hover();
    accountState.orders = accountState.orders.slice(1);
    await expect(row).toContainText("(1/3)");
    await row.getByText(/\(1\/3\)/).hover();
    await expect(page.getByText("Executed", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Pending", { exact: true })).toHaveCount(2);
    await accountState.refresh(page);
    await expect(row).toContainText("(1/3)");
    await expect(row).toContainText(/3,000\.00/);
  });
}
