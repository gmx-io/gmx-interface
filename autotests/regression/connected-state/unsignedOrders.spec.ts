import { expect, type Page } from "@playwright/test";
import { getAddress, maxUint256 } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { fundTrading, test, type AccountState } from "../fixtures/accountState";
import type { WalletRequest } from "../fixtures/injectedWallet";
import { infoRowValue, openExecutionDetails } from "../fixtures/marketData";
import arbitrum from "../fixtures/markets/arbitrum.json";
import avalanche from "../fixtures/markets/avalanche.json";
import { inputNumber, labelledInput, openSettings, setSettingsToggle } from "../fixtures/trade";
import { configureClassicTrading, fillPositionOrder } from "../fixtures/tradingForms";
import { inspectRejectedCreateOrder } from "../fixtures/walletReview";

const USD = 10n ** 30n;
const orderTypes = { Market: 2, Limit: 3, "Stop Market": 8 } as const;
type Mode = keyof typeof orderTypes;

test.use({ walletReviewMode: true, unsignedReviewMode: true });
test.beforeEach(async ({ page, accountState, chainId }) => {
  fundTrading(accountState, chainId);
  await accountState.connect(page);
  await configureClassicTrading(page);
});

// Contract prices are USD per index-token unit with 30 decimals, the same format as the snapshot tickers.
function snapshotPrices(chainId: number, token: string) {
  const ticker = (chainId === 42161 ? arbitrum : avalanche).tickers.find(
    (t) => getAddress(t.tokenAddress) === getAddress(token)
  )!;
  return { min: BigInt(ticker.minPrice), max: BigInt(ticker.maxPrice) };
}

function triggerFor(mode: Mode, isLong: boolean) {
  return mode === "Market" ? undefined : (mode === "Limit") === isLong ? "1000" : "10000";
}

function withBps(price: bigint, bps: bigint, up: boolean) {
  return (price * (10_000n + (up ? bps : -bps))) / 10_000n;
}

async function submitOrder(
  page: Page,
  {
    accountState,
    walletReviews,
    chainId,
  }: { accountState: AccountState; walletReviews: WalletRequest[]; chainId: number },
  { isLong, mode, beforeSubmit }: { isLong: boolean; mode: Mode; beforeSubmit?: () => Promise<void> }
) {
  const trigger = triggerFor(mode, isLong);
  const button = await fillPositionOrder(page, { isLong, collateral: "2.5", size: "2.01", mode, trigger });
  await beforeSubmit?.();
  await expect(button).not.toHaveText(/Approve|Loading/);
  await expect(button).toBeEnabled({ timeout: 30_000 });
  const { tx, calls, order } = await inspectRejectedCreateOrder(button, walletReviews);
  expect(getAddress(tx.from)).toBe(accountState.address);
  expect(getAddress(tx.to)).toBe(getAddress(getContract(chainId as ContractsChainId, "ExchangeRouter")));
  expect(getAddress(order.addresses.receiver)).toBe(accountState.address);
  expect(getAddress(order.addresses.market)).toBe(getAddress(accountState.data.market.marketTokenAddress));
  expect(getAddress(order.addresses.initialCollateralToken)).toBe(getAddress(accountState.data.collateral.address));
  expect(order.orderType).toBe(orderTypes[mode]);
  expect(order.isLong).toBe(isLong);
  expect(order.numbers.initialCollateralDeltaAmount).toBe(2_500_000n);
  if (mode === "Market") {
    // USD sizing is recalculated from tokens while the live mark price changes.
    expect(order.numbers.sizeDeltaUsd).toBeGreaterThan(2n * USD);
    expect(order.numbers.sizeDeltaUsd).toBeLessThan((202n * USD) / 100n);
  } else expect(order.numbers.sizeDeltaUsd).toBe((201n * USD) / 100n);
  expect(order.numbers.triggerPrice).toBe(trigger ? BigInt(trigger) * 10n ** 12n : 0n);
  expect(order.numbers.executionFee).toBeGreaterThan(0n);
  expect(BigInt(tx.value ?? "0")).toBe(order.numbers.executionFee);
  expect(calls.filter((call) => !["sendWnt", "sendTokens", "createOrder"].includes(call.functionName))).toEqual([]);
  await expect(button).not.toHaveText(/Creating|Loading/);
  await expect(page.getByTestId("trade-table-large")).toContainText("No open positions");
  return order;
}

for (const isLong of [true, false]) {
  const side = isLong ? "Long" : "Short";

  test(`5.31 unsigned Market ${side}: acceptable price is the mark price moved by the shown allowed slippage against the trader; wallet rejection recovers`, async ({
    page,
    accountState,
    walletReviews,
    chainId,
  }, testInfo) => {
    let slippageBps = 0n;
    const order = await submitOrder(
      page,
      { accountState, walletReviews, chainId },
      {
        isLong,
        mode: "Market",
        beforeSubmit: async () => {
          const box = await openExecutionDetails(page);
          slippageBps = BigInt(Math.round((await inputNumber(labelledInput(box, "Allowed slippage"))) * 100));
        },
      }
    );
    expect(slippageBps).toBe(30n);
    const prices = snapshotPrices(chainId, accountState.data.index.address);
    // Increases open at the max price for longs and the min price for shorts.
    const expected = withBps(isLong ? prices.max : prices.min, slippageBps, isLong);
    const acceptable = order.numbers.acceptablePrice;
    await testInfo.attach("acceptable-price", {
      body: JSON.stringify({
        acceptable: String(acceptable),
        expected: String(expected),
        slippageBps: String(slippageBps),
      }),
      contentType: "application/json",
    });
    // The app also moves it by the order's marginal price impact (about 0.02% in these snapshots); allow 0.05%.
    const tolerance = (expected * 5n) / 10_000n;
    expect(acceptable >= expected - tolerance && acceptable <= expected + tolerance).toBe(true);
  });

  for (const mode of ["Limit", "Stop Market"] as const) {
    test(`5.31 ${mode === "Limit" ? "6.06" : "6.12"} unsigned ${mode} ${side} with default settings: the trigger is sent as entered and the acceptable price is unbounded; wallet rejection recovers`, async ({
      page,
      accountState,
      walletReviews,
      chainId,
    }) => {
      const order = await submitOrder(
        page,
        { accountState, walletReviews, chainId },
        {
          isLong,
          mode,
          beforeSubmit: async () => {
            const box = await openExecutionDetails(page);
            await expect(box.getByText("Acceptable price impact", { exact: true })).toHaveCount(0);
          },
        }
      );
      expect(order.numbers.acceptablePrice).toBe(isLong ? maxUint256 : 0n);
    });

    test(`5.31 ${mode === "Limit" ? "6.06" : "6.12"} unsigned ${mode} ${side} with "Set acceptable price impact": ${
      mode === "Limit"
        ? "acceptable price is the trigger moved by the shown impact buffer"
        : "impact is N/A and the acceptable price stays unbounded"
    }`, async ({ page, accountState, walletReviews, chainId }) => {
      const settings = await openSettings(page);
      await setSettingsToggle(settings, "Set acceptable price impact", true);
      await page.keyboard.press("Escape");
      let impactBps: bigint | undefined;
      const order = await submitOrder(
        page,
        { accountState, walletReviews, chainId },
        {
          isLong,
          mode,
          beforeSubmit: async () => {
            const box = await openExecutionDetails(page);
            if (mode === "Stop Market") {
              await expect(infoRowValue(box, "Acceptable price impact")).toHaveText("N/A");
              return;
            }
            const impact = labelledInput(box, "Acceptable price impact");
            await expect.poll(() => inputNumber(impact)).toBeGreaterThan(0);
            impactBps = BigInt(Math.round((await inputNumber(impact)) * 100));
          },
        }
      );
      if (mode === "Stop Market") {
        expect(order.numbers.acceptablePrice).toBe(isLong ? maxUint256 : 0n);
        return;
      }
      // The recommended value is the 0.3% default buffer plus the current impact at the trigger price.
      expect(impactBps).toBeGreaterThanOrEqual(30n);
      expect(impactBps).toBeLessThan(40n);
      expect(order.numbers.acceptablePrice).toBe(withBps(order.numbers.triggerPrice, impactBps!, isLong));
    });
  }
}
