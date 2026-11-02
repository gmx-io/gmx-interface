import assert from "node:assert/strict";
import { expect, type Locator, type Page } from "@playwright/test";
import { formatUnits, getAddress, maxUint256, type Abi } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { affordablePosition, ceilDiv, economy, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually, ownPlannedPosition, position } from "./trading";
import { inspectUiOrder, type UiOrderIntent } from "./uiOrderGuard";
import { inspectUiOneClickRelay } from "./uiOneClickGuard";
import { UiWallet } from "./uiWallet";
import { fillPositionOrder, fundedPositionRow } from "../fixtures/tradingForms";
import { labelledInput, selectMarket } from "../fixtures/trade";

async function chainOrder(session: FundedSession, key: string) {
  return (await session.rpc.readContract({
    abi: SyntheticsReader as Abi,
    address: getContract(42161, "SyntheticsReader"),
    functionName: "getOrder",
    args: [getContract(42161, "DataStore"), key],
  })) as { numbers: { triggerPrice: bigint; acceptablePrice: bigint; sizeDeltaUsd: bigint } };
}

type UiSnapshot = Awaited<ReturnType<FundedSession["snapshot"]>>;

export async function submitUiOrderAction(
  session: FundedSession,
  wallet: UiWallet,
  purpose: string,
  intent: UiOrderIntent,
  fill: () => Promise<Locator>,
  preflight: (state: UiSnapshot) => void,
  options: { cleanup?: boolean; marketAddress?: string; approval?: { token: string; amount: bigint } } = {}
) {
  const previous = await session.previousAction(`ui:${purpose}`);
  if (previous) return previous;
  preflight(await session.snapshot());
  const button = await fill();
  return wallet.submit(
    {
      purpose,
      beforeClick: async () => {
        if (
          session.active.inventory?.uiOneClickAuthorized === "true" &&
          intent.kind === "increase" &&
          !/Approve/.test((await button.textContent()) ?? "")
        ) {
          // Collateral approval refreshes before the separate relay-fee allowance cache.
          await expect(button).toHaveAttribute("data-one-click-ready", "true", { timeout: 45_000 });
        }
      },
      cleanup: options.cleanup,
      preflight,
      approval: options.approval && {
        ...options.approval,
        amount: session.active.inventory?.uiOneClickAuthorized === "true" ? 5_000_000n : options.approval.amount,
        spender: getContract(42161, "SyntheticsRouter"),
      },
      inspectRelay:
        session.active.inventory?.uiOneClickAuthorized === "true"
          ? (payload, state) => inspectUiOneClickRelay(session, payload, intent, state)
          : undefined,
      inspect: (tx, state) => {
        assert.ok(
          session.active.inventory?.uiOneClickAuthorized !== "true",
          "1CT action fell back to a native transaction"
        );
        const checked = inspectUiOrder(tx, intent, {
          address: session.address,
          marketAddress: state.market.marketTokenAddress,
          usdc: state.usdc,
          weth: state.weth,
          ownedOrderKeys: session.active.ownedOrderKeys,
        });
        return {
          extraFeeUsd: checked.extraFeeUsd,
          uiOrder: {
            createdCount: checked.createdCount,
            marketAddress: options.marketAddress ?? state.market.marketTokenAddress,
            sizeDeltaUsd: checked.sizeDeltaUsd.toString(),
            ...(intent.kind === "cancel" ? { cancelledKeys: intent.keys } : {}),
          },
        };
      },
    },
    button
  );
}

export function assertUiInventory(
  session: FundedSession,
  state: UiSnapshot,
  expectedOrders: string[],
  expectedSize = 0n
) {
  assert.equal(state.onchainOrderCount, state.orders.length);
  assert.deepEqual(state.orders.map((o) => o.key).sort(), [...expectedOrders].sort(), "Unexpected pending orders");
  for (const order of state.orders) assert.ok(session.active.ownedOrderKeys.includes(order.key), "Unowned order");
  assert.equal(state.onchainPositionCount, state.positions.length);
  assert.equal(state.positions.length, expectedSize === 0n ? 0 : 1);
  assert.equal(state.positions[0]?.sizeInUsd ?? 0n, expectedSize, "Position changed during UI operation");
  if (state.positions[0]) {
    assert.ok(session.active.ownedPositionKeys.includes(state.positions[0].key), "Unowned position");
    assert.equal(getAddress(state.positions[0].marketAddress), getAddress(state.market.marketTokenAddress));
    assert.equal(getAddress(state.positions[0].collateralTokenAddress), getAddress(state.usdc.address));
    assert.ok(expectedSize <= economy.positionLimitUsd);
  }
}

export async function createUiTrigger(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  isLong: boolean,
  kind: "limit" | "stop-market" | "take-profit" | "stop-loss"
) {
  const state = await session.snapshot();
  const increase = kind === "limit" || kind === "stop-market";
  const planned = await session.remember("ui-trigger", async () => {
    const before = increase ? undefined : await position(session);
    assertUiInventory(session, state, [], before?.sizeInUsd);
    const sizing = affordablePosition({ ...state.market, openingCostsUsd: USD / 2n });
    const below =
      kind === "limit" ? isLong : kind === "stop-market" ? !isLong : kind === "take-profit" ? !isLong : isLong;
    return {
      beforeSize: before?.sizeInUsd ?? 0n,
      sizeUsd: before ? maxUint256 : sizing.sizeUsd + USD / 100n,
      collateralAmount:
        before?.collateralAmount ?? ceilDiv(sizing.collateralUsd * 10n ** 6n, state.usdc.prices.minPrice),
      triggerPrice: ((state.weth.prices.minPrice * (below ? 50n : 150n)) / 100n / 10n ** 18n / 10n ** 10n) * 10n ** 10n,
    };
  });
  if (increase) await ownPlannedPosition(session, isLong);
  const orderType = kind === "limit" ? 3 : kind === "stop-market" ? 8 : kind === "take-profit" ? 5 : 6;
  const intent: UiOrderIntent = increase
    ? {
        kind: "increase",
        isLong,
        sizeUsd: planned.sizeUsd,
        sizeToleranceUsd: planned.sizeUsd / 1_000n,
        collateralAmount: planned.collateralAmount,
        orderType: orderType as 3 | 8,
        triggerPrice: planned.triggerPrice,
      }
    : {
        kind: "close",
        isLong,
        sizeUsd: maxUint256,
        collateralAmount: planned.collateralAmount,
        orderType: orderType as 5 | 6,
        triggerPrice: planned.triggerPrice,
        fullPositionSizeUsd: planned.beforeSize,
      };
  const action = await submitUiOrderAction(
    session,
    wallet,
    "trigger",
    intent,
    async () => {
      if (increase)
        return fillPositionOrder(page, {
          isLong,
          mode: kind === "limit" ? "Limit" : "Stop Market",
          collateral: formatUnits(planned.collateralAmount, 6),
          size: formatUnits(planned.sizeUsd, 30),
          trigger: formatUnits(planned.triggerPrice, 12),
        });
      await page
        .getByTestId("exchange-list-tabs")
        .getByRole("button", { name: /^Positions/ })
        .click();
      await selectMarket(page, "ETH");
      await fundedPositionRow(page, isLong).getByRole("button", { name: "Set", exact: true }).click();
      await page.getByRole("button", { name: "Add TP/SL", exact: true }).last().click();
      const modal = page
        .locator(".Modal-content")
        .filter({ has: page.getByText(new RegExp(`^(TP/SL|TP|SL): Close ETH/USD ${isLong ? "Long" : "Short"}$`)) });
      await labelledInput(modal, `${kind === "take-profit" ? "TP" : "SL"} price`).fill(
        formatUnits(planned.triggerPrice, 12)
      );
      return modal.locator("button.primary-action");
    },
    (fresh) => {
      assertUiInventory(session, fresh, [], planned.beforeSize);
      if (increase)
        assert.ok(
          fresh.stableUsd - (planned.collateralAmount * fresh.usdc.prices.maxPrice) / 10n ** 6n >=
            economy.stableReserveUsd
        );
      const mark = fresh.weth.prices.minPrice / 10n ** 18n;
      assert.ok(
        planned.triggerPrice < (mark * 80n) / 100n || planned.triggerPrice > (mark * 120n) / 100n,
        "Trigger moved too close to execution"
      );
    },
    { approval: increase ? { token: state.usdc.address, amount: planned.collateralAmount } : undefined }
  );
  assert.equal(action.orderKeys?.length, 1);
  const key = action.orderKeys![0];
  await eventually(
    () => session.snapshot(),
    (fresh) =>
      fresh.orders.some(
        (o) =>
          o.key === key &&
          (o.triggerPrice === planned.triggerPrice || o.triggerPrice === planned.triggerPrice * 10n ** 18n)
      ) && fresh.onchainOrderCount === 1
  );
  const onchain = await chainOrder(session, key);
  assert.equal(onchain.numbers.triggerPrice, planned.triggerPrice);
  assert.equal(onchain.numbers.sizeDeltaUsd, BigInt(action.uiOrder!.sizeDeltaUsd!));
  return key;
}

export async function editUiTrigger(session: FundedSession, wallet: UiWallet, page: Page, key: string) {
  const before = await session.remember("ui-edit", async () => {
    const state = await session.snapshot();
    const order = state.orders.find((o) => o.key === key);
    assert.ok(order && session.active.ownedOrderKeys.includes(key));
    return { order, onchain: await chainOrder(session, key), size: state.positions[0]?.sizeInUsd ?? 0n };
  });
  const order = before.order;
  const price = ((before.onchain.numbers.triggerPrice * 101n) / 100n / 10n ** 10n) * 10n ** 10n;
  await submitUiOrderAction(
    session,
    wallet,
    "edit",
    {
      kind: "edit",
      key,
      sizeUsd: order.sizeDeltaUsd,
      triggerPrice: price,
      acceptablePrice: before.onchain.numbers.acceptablePrice,
      minOutputAmount: order.minOutputAmount,
      validFromTime: order.validFromTime,
      autoCancel: order.autoCancel,
      editDirection: { isLong: order.isLong, orderType: order.orderType },
      ...(order.sizeDeltaUsd === maxUint256 ? { fullPositionSizeUsd: before.size } : {}),
    },
    async () => {
      await page
        .getByTestId("exchange-list-tabs")
        .getByRole("button", { name: /^Orders/ })
        .click();
      await page.getByTestId(`order-${key}`).getByRole("button", { name: "Edit order", exact: true }).click();
      const input = page.getByTestId("trigger-price-input-input");
      await input.fill(formatUnits(price, 12));
      return page.locator(".Modal-content").filter({ has: input }).locator("button.primary-action");
    },
    (state) => assertUiInventory(session, state, [key], before.size)
  );
  await eventually(
    () => session.snapshot(),
    (state) =>
      state.orders.some((o) => o.key === key && (o.triggerPrice === price || o.triggerPrice === price * 10n ** 18n))
  );
  assert.equal((await chainOrder(session, key)).numbers.triggerPrice, price);
}

export async function cancelUiOrders(
  session: FundedSession,
  wallet: UiWallet,
  page: Page,
  keys: string[],
  twap = false
) {
  const beforeSize = await session.remember(
    "ui-cancel-size",
    async () => (await session.snapshot()).positions[0]?.sizeInUsd ?? 0n
  );
  assert.equal(keys.length, 1, "Cancel one selected pending order per UI action");
  await submitUiOrderAction(
    session,
    wallet,
    "cancel",
    { kind: "cancel", keys },
    async () => {
      await page
        .getByTestId("exchange-list-tabs")
        .getByRole("button", { name: /^Orders/ })
        .click();
      if (session.active.inventory?.uiOneClickAuthorized === "true")
        await expect(page.getByTestId("margin-balance")).toContainText(/\d/, { timeout: 45_000 });
      const row = twap
        ? page
            .getByTestId("trade-table-large")
            .getByRole("row")
            .filter({ has: page.getByRole("cell", { name: "TWAP", exact: true }) })
        : page.getByTestId(`order-${keys[0]}`);
      await expect(row).toBeVisible();
      return row.getByRole("button", { name: "", exact: true }).last();
    },
    (state) => assertUiInventory(session, state, keys, beforeSize),
    { cleanup: true }
  );
  await eventually(
    () => session.snapshot(),
    (state) => !state.orders.length && !state.onchainOrderCount
  );
}
