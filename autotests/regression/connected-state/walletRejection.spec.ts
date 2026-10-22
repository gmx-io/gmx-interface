import { expect } from "@playwright/test";
import { decodeFunctionData, erc20Abi, getAddress, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test } from "../fixtures/accountState";
import { configureClassicTrading, fillPositionOrder } from "../fixtures/tradingForms";

test.use({ walletReviewMode: true });

for (const isLong of [true, false]) {
  test(`${isLong ? "Long" : "Short"} rejected USDC approval returns the form to an actionable state`, async ({
    page,
    accountState,
    walletReviews,
    chainId,
  }) => {
    accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
    accountState.balances.set(zeroAddress, 10n ** 18n);
    await accountState.connect(page);
    await expect(page.getByTestId("margin")).toContainText("1,000.00");
    await configureClassicTrading(page);
    const button = await fillPositionOrder(page, { isLong, collateral: "2.5", size: "2.01" });
    await expect(button).toHaveText("Approve USDC");
    await button.click();
    await expect.poll(() => walletReviews.length).toBe(1);
    expect(walletReviews[0].method).toBe("eth_sendTransaction");
    const tx = walletReviews[0].params![0] as { to: string; data: string };
    expect(getAddress(tx.to)).toBe(getAddress(accountState.data.collateral.address));
    const call = decodeFunctionData({ abi: erc20Abi, data: tx.data });
    expect(call.functionName).toBe("approve");
    if (call.functionName !== "approve") throw new Error("Expected USDC approval");
    expect(getAddress(call.args[0])).toBe(getAddress(getContract(chainId as ContractsChainId, "SyntheticsRouter")));
    await expect(button).toHaveText("Approve USDC");
    await expect(button).toBeEnabled();
    await expect(page.getByTestId("margin-input")).toHaveValue("2.5");
    await expect(page.getByTestId("position-size-input")).toHaveValue("2.01");
    await expect(page.getByTestId("trade-table-large")).toContainText("No open positions");
  });
}
