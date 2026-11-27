import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";
import { decodeFunctionData, toFunctionSelector, type Hex } from "viem";

import { hashString, MOCK_ACCOUNT_PRIVATE_KEY, MockChain } from "domain/testUtils/rpc/mockChain";
import { installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import type { RpcRequest } from "domain/testUtils/rpc/types";
import { getDataQALocator } from "lib/__tests__/testUtils";
import { getAbi } from "sdk/abis/getAbi";
import { ARBITRUM } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { isSameAddress } from "sdk/utils/address";
import { OrderType } from "sdk/utils/orders/types";

import { TradeBoxStory } from "./TradeBox.ct.stories";

type PageLike = {
  locator: (selector: string, options?: { hasText?: RegExp }) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
};

function infoRowLabel(page: PageLike, label: RegExp) {
  return page.locator(".font-medium.text-typography-secondary", { hasText: label });
}

function infoRow(page: PageLike, label: RegExp) {
  return infoRowLabel(page, label).locator("..");
}

const FRESH_POSITION_WARNING = /may execute after the current position is liquidated/;

test.beforeEach(async ({ page }) => {
  // the mock chain answers RPC (unlimited allowance), other requests are dropped
  await installRpcResponder(page, new MockChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY }));
});

function selectLimitMode(page: PageLike) {
  return page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "Limit", exact: true }).click();
}

function selectShortDirection(page: PageLike) {
  return page.locator(getDataQALocator("trade-direction")).getByRole("button", { name: "Short", exact: true }).click();
}

const liqRow = (page: PageLike) => page.getByText("Liquidation price").locator("..");

const EXCHANGE_ROUTER_ADDRESS = getContract(ARBITRUM, "ExchangeRouter");
const MULTICALL_SELECTOR = toFunctionSelector("multicall(bytes[])");

/** The app sends an order only after its simulation reverts with EndOfOracleSimulation. */
class SimulatingChain extends MockChain {
  async handle(chainId: number, request: RpcRequest): Promise<unknown> {
    const call = request.method === "eth_call" ? (request.params as { to?: string; data?: string }[])[0] : undefined;

    if (isSameAddress(call?.to, EXCHANGE_ROUTER_ADDRESS) && call?.data?.startsWith(MULTICALL_SELECTOR)) {
      throw Object.assign(new Error("execution reverted"), {
        rpcCode: 3,
        rpcData: toFunctionSelector("EndOfOracleSimulation()"),
      });
    }

    return super.handle(chainId, request);
  }
}

function createSimulatingChain() {
  const chain = new SimulatingChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY });
  chain.setDataStoreUint(hashString("INCREASE_ORDER_GAS_LIMIT"), 4000000n);
  chain.setDataStoreUint(hashString("DECREASE_ORDER_GAS_LIMIT"), 4000000n);
  chain.setDataStoreUint(hashString("ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1"), 600000n);
  chain.setDataStoreUint(hashString("ESTIMATED_GAS_FEE_PER_ORACLE_PRICE"), 250000n);
  chain.setDataStoreUint(hashString("ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR"), 10n ** 30n);

  return chain;
}

function getSidecarOrderCalls(multicallData: string) {
  const abi = getAbi(ARBITRUM, "ExchangeRouter");
  const multicall = decodeFunctionData({ abi, data: multicallData as Hex });

  if (multicall.functionName !== "multicall") {
    return [];
  }

  return multicall.args[0].flatMap((callData): (string | { orderType: number; autoCancel: boolean })[] => {
    const call = decodeFunctionData({ abi, data: callData });

    if (call.functionName === "createOrder" && call.args[0].orderType !== OrderType.LimitIncrease) {
      return [{ orderType: call.args[0].orderType, autoCancel: call.args[0].autoCancel }];
    }

    return call.functionName === "updateOrder" || call.functionName === "cancelOrder" ? [call.functionName] : [];
  });
}

test.describe("Limit Increase beyond the current liquidation price", () => {
  test.describe("Long position (liquidates at $1050)", () => {
    test("keeps the existing position in the preview when it survives at the trigger price", async ({
      mount,
      page,
    }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);

      await page.getByText("Execution details").click();
      await expect(infoRow(page, /^Size$/)).toContainText(/2,?000/);
      await expect(infoRow(page, /^Margin \(USDC\)$/)).toContainText(/1,?000/);
      await expect(infoRow(page, /^Entry price$/)).toContainText(/2,?000/);
    });

    test("previews a fresh position when the trigger price is below the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("900");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();
      await expect(liqRow(page)).not.toContainText(/1,?050/);
      await page.getByText("Execution details").click();
      await expect(infoRowLabel(page, /^Size$/)).toHaveCount(0);
      await expect(infoRowLabel(page, /^Margin \(USDC\)$/)).toHaveCount(0);
      await expect(infoRowLabel(page, /^Entry price$/)).toHaveCount(0);
    });

    test("the warning appears and disappears as the trigger crosses the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const triggerPriceInput = page.locator(getDataQALocator("trigger-price-input"));

      await triggerPriceInput.fill("1500");
      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();

      await triggerPriceInput.fill("900");
      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();

      await triggerPriceInput.fill("1500");
      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });

    test("does not warn for a Market Increase", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });

    test("does not warn for a Stop Market Increase priced above the mark", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "More" }).click();
      await page.getByText("Stop Market", { exact: true }).click();

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("2500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });
  });

  test.describe("Short position (liquidates at $2950)", () => {
    test("keeps the existing position in the preview when it survives at the trigger price", async ({
      mount,
      page,
    }) => {
      await mount(<TradeBoxStory withPosition positionIsShort />);

      await selectShortDirection(page);
      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("2500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/2,?950/);
    });

    test("previews a fresh position when the trigger price is above the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition positionIsShort />);

      await selectShortDirection(page);
      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("3200");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();
      await expect(liqRow(page)).not.toContainText(/2,?950/);

      await page.getByText("Execution details").click();
      await expect(infoRowLabel(page, /^Size$/)).toHaveCount(0);
    });
  });

  test.describe("Validation against the fresh projection", () => {
    test("rejects an order that is only safe thanks to the doomed position's collateral", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition manualLeverage />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("100");
      await page.locator(getDataQALocator("position-size-input")).fill("50000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("900");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Max leverage/);
      await expect(submitButton).toBeDisabled();
    });

    test("accepts the same order when the position survives at the trigger price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition manualLeverage />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("100");
      await page.locator(getDataQALocator("position-size-input")).fill("50000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText("Limit: Increase Long");
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("TP/SL signed with the order SEC-66", () => {
    test.setTimeout(90_000);

    for (const { name, triggerPrice, sidecarOrders } of [
      {
        name: "sends no TP/SL that the current position's liquidation would cancel",
        triggerPrice: "900",
        sidecarOrders: [],
      },
      {
        name: "sends TP/SL that close with the position they are added to",
        triggerPrice: "1500",
        sidecarOrders: [
          { orderType: OrderType.StopLossDecrease, autoCancel: true },
          { orderType: OrderType.LimitDecrease, autoCancel: true },
        ],
      },
    ]) {
      test(name, async ({ mount, page }) => {
        const chain = createSimulatingChain();
        await installRpcResponder(page, chain);
        await mount(<TradeBoxStory withPosition />);

        await selectLimitMode(page);
        await page.locator(getDataQALocator("margin-input")).fill("1000");
        const triggerPriceInput = page.locator(getDataQALocator("trigger-price-input"));
        await triggerPriceInput.fill("1500");
        await page.getByText("Take-Profit / Stop-Loss").click();
        await page.getByPlaceholder("TP price").fill("2500");
        await page.getByPlaceholder("SL price").fill("1200");
        await triggerPriceInput.fill("900");
        await triggerPriceInput.fill(triggerPrice);

        const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
        await expect(submitButton).toBeEnabled({ timeout: 40_000 });
        await submitButton.click();

        await expect.poll(() => chain.sentTransactions.length, { timeout: 40_000 }).toBe(1);
        expect(getSidecarOrderCalls(chain.sentTransactions[0].data)).toEqual(sidecarOrders);
      });
    }
  });
});
