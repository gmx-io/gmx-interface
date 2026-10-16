import { expect } from "@playwright/test";
import { formatUnits, getAddress, parseUnits, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getNativeToken, getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test } from "../fixtures/accountState";
import { configureClassicTrading } from "../fixtures/tradingForms";
import { inspectRejectedOrder } from "../fixtures/walletReview";
import { displayedNumbers, infoRow, selectTradeMode } from "../fixtures/trade";

test.use({ walletReviewMode: true, unsignedReviewMode: true });
for (const mode of ["Market", "Limit"] as const) {
  test(`11.09 unsigned ${mode} swap: shown receive, minimum receive and max network fee match the rejected wallet request`, async ({
    page,
    accountState,
    chainId,
    walletReviews,
  }) => {
    accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
    accountState.balances.set(zeroAddress, 10n ** 18n);
    accountState.allowances.set(
      getAddress(accountState.data.collateral.address),
      new Map([[getAddress(getContract(chainId as ContractsChainId, "SyntheticsRouter")), 100n * 10n ** 6n]])
    );
    await accountState.connect(page, "/trade/swap?mode=market&from=USDC&to=ETH");
    await configureClassicTrading(page);
    await selectTradeMode(page, mode);
    if (mode === "Limit") await page.getByTestId("trigger-price-input").fill("1000");
    await page.getByTestId("pay-input").fill("1");
    const tradebox = page.getByTestId("tradebox");
    const receive = page.getByTestId("swap-receive-input");
    await expect.poll(async () => Number(await receive.inputValue())).toBeGreaterThan(0);
    const receiveAmount = parseUnits(await receive.inputValue(), 18);
    const minimumReceive = (await displayedNumbers(infoRow(tradebox, "Minimum receive")))[0];
    await tradebox.getByRole("button", { name: "Execution details", exact: true }).click();
    const readMaxNetworkFee = async () => {
      await infoRow(tradebox, "Network fee").locator(".Tooltip-handle").last().hover();
      const maxFee = page.locator(".Tooltip-popup .Tooltip-row").filter({ hasText: "Max network fee" });
      await expect(maxFee).toContainText(getNativeToken(chainId).symbol);
      const value = (await displayedNumbers(maxFee))[0];
      await page.getByRole("banner").hover();
      return value;
    };
    // Gas price is live, so the fee may be re-estimated around the click (seen on Avalanche).
    const shownFees = [await readMaxNetworkFee()];

    const { calls, tx } = await inspectRejectedOrder(page.getByTestId("confirm-trade-button"), walletReviews);
    shownFees.push(await readMaxNetworkFee());
    const creates = calls.filter((call) => call.functionName === "createOrder");
    expect(creates).toHaveLength(1);
    const create = creates[0];
    if (create.functionName !== "createOrder") throw new Error("Expected swap order");
    const order = create.args[0];
    expect(order.orderType).toBe(mode === "Market" ? 0 : 1);
    expect(getAddress(order.addresses.initialCollateralToken)).toBe(getAddress(accountState.data.collateral.address));
    expect(getAddress(order.addresses.receiver)).toBe(accountState.address);
    expect(order.addresses.market).toBe(zeroAddress);
    expect(order.addresses.swapPath.length).toBeGreaterThan(0);
    expect(order.numbers.initialCollateralDeltaAmount).toBe(1_000_000n);
    expect(order.numbers.sizeDeltaUsd).toBe(0n);
    // Market applies the 0.3% slippage set by configureClassicTrading; Limit sends the shown receive amount.
    expect(order.numbers.minOutputAmount).toBe(mode === "Market" ? (receiveAmount * 9970n) / 10000n : receiveAmount);
    expect(Math.abs(Number(formatUnits(order.numbers.minOutputAmount, 18)) / minimumReceive - 1)).toBeLessThan(0.0005);
    const executionFee = Number(formatUnits(order.numbers.executionFee, 18));
    expect(Math.min(...shownFees.map((fee) => Math.abs(executionFee - fee)))).toBeLessThanOrEqual(0.00001);
    expect(order.shouldUnwrapNativeToken).toBe(Boolean(getTokenBySymbol(chainId, "ETH").isNative));
    expect(BigInt(tx.value ?? "0")).toBe(order.numbers.executionFee);
    await expect(page.getByTestId("pay-input")).toHaveValue("1");
    await expect(page.getByTestId("receive-selector")).toContainText("ETH");
  });
}
