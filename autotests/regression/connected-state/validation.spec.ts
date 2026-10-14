import { expect } from "@playwright/test";
import { getAddress, zeroAddress } from "viem";

import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import { test } from "../fixtures/accountState";
import { configureClassicTrading, fillPositionOrder } from "../fixtures/tradingForms";

const balance = 1_000_000_000_000n * 10n ** 6n;
test.beforeEach(async ({ page, accountState, chainId }) => {
  accountState.balances.set(accountState.data.collateral.address, balance);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  accountState.allowances.set(
    getAddress(accountState.data.collateral.address),
    new Map([[getAddress(getContract(chainId as ContractsChainId, "SyntheticsRouter")), balance]])
  );
  await accountState.connect(page);
  await configureClassicTrading(page);
});

for (const isLong of [true, false]) {
  test(`22.27 ${isLong ? "Long" : "Short"} size above available open interest is rejected before the wallet`, async ({
    page,
  }) => {
    const button = await fillPositionOrder(page, { isLong, collateral: "10000000000", size: "10000000000" });
    await expect(button).toHaveText(`Max ETH ${isLong ? "long" : "short"} exceeded`);
    await expect(button).toBeDisabled();
  });
  test(`22.26 ${isLong ? "Long" : "Short"} excessive leverage is rejected and lower size restores a valid form`, async ({
    page,
  }) => {
    const button = await fillPositionOrder(page, {
      isLong,
      collateral: "100",
      size: "100000",
      mode: "Limit",
      trigger: isLong ? "1000" : "10000",
    });
    await expect(button).toHaveText(/^Max leverage(: [\d.]+x| exceeded)$/);
    await expect(button).toBeDisabled();
    await page.getByTestId("position-size-input").fill("200");
    await expect(button).toBeEnabled();
  });
  for (const mode of ["Limit", "Stop Market"] as const) {
    test(`6.01 6.12 ${mode} ${isLong ? "Long" : "Short"} enforces the correct side of the mark price`, async ({
      page,
    }) => {
      const wrong = (mode === "Limit") === isLong ? "10000" : "1000";
      const correct = wrong === "10000" ? "1000" : "10000";
      const side = (mode === "Limit") === isLong ? "below" : "above";
      const button = await fillPositionOrder(page, { isLong, collateral: "2.5", size: "2.01", mode, trigger: wrong });
      await expect(button).toHaveText(`Set ${mode === "Limit" ? "limit" : "stop"} price ${side} mark price`);
      await expect(button).toBeDisabled();
      await page.getByTestId("trigger-price-input").fill(correct);
      await expect(button).toBeEnabled();
    });
  }
}
