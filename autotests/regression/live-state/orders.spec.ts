import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { getAddress, maxUint256, type Address, type Hex } from "viem";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getContract } from "../../../sdk/src/configs/contracts";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { convertTokenAddress, getToken } from "../../../sdk/src/configs/tokens";
import type { Token } from "../../../sdk/src/utils/tokens/types";
import { getMarketIndexName, getMarketPoolName } from "../../../sdk/src/utils/markets/utils";
import { formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { decodeTwapUiFeeReceiver } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount, LiveAccounts } from "../fixtures/liveAccounts";
import { openTooltip } from "../fixtures/marketData";

test.use({ liveProfile: "order" });

const orderNames: Record<number, string> = { 3: "Limit", 5: "Take-Profit", 6: "Stop-Loss", 8: "Stop Market" };
// Long limits and stop-losses trigger below the price; their short sides, take-profits and stop markets above it.
const triggersAbove = (orderType: number, isLong: boolean) => (orderType === 3 || orderType === 6 ? !isLong : isLong);
const text = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim();

// Displayed trigger price in the row's own precision, e.g. "< $2,345.67".
async function expectTrigger(
  row: Locator,
  orderType: number,
  isLong: boolean,
  contractPrice: bigint,
  indexToken: Token
) {
  const shown = text(
    await row
      .getByRole("cell")
      .filter({ hasText: /^\s*[<>]\s/ })
      .textContent()
  );
  const displayDecimals = shown.split(".")[1]?.length ?? 0;
  const price = formatUsd(contractPrice * 10n ** BigInt(indexToken.decimals), {
    displayDecimals,
    visualMultiplier: indexToken.visualMultiplier,
  });
  expect(shown).toBe(text(`${triggersAbove(orderType, isLong) ? ">" : "<"} ${price}`));
  return shown;
}

// TWAP parts share one row.
async function expectAllOrders(page: Page, liveAccounts: LiveAccounts, account: Address) {
  const chainId = liveAccounts.chainId;
  const orders = await liveAccounts.orders(account);
  const twap = (o: (typeof orders)[number]) => (o.uiFeeReceiver ? decodeTwapUiFeeReceiver(o.uiFeeReceiver) : undefined);
  const single = orders.filter((o) => !twap(o));
  const twapGroups = new Set(
    orders
      .filter((o) => twap(o))
      .map((o) =>
        [twap(o)!.twapId, o.orderType, o.isLong, o.marketAddress, o.initialCollateralTokenAddress, ...o.swapPath].join()
      )
  );
  await expect(page.locator('[data-qa^="order-"]')).toHaveCount(single.length + twapGroups.size, { timeout: 45_000 });
  for (const order of single) {
    const row = page.getByTestId(`order-${order.key}`);
    await expect(row).toBeVisible();
    if (!orderNames[order.orderType]) continue;
    const market = MARKETS[chainId][getAddress(order.marketAddress)];
    const indexToken = getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
    await expect(row.getByText(getMarketIndexName({ indexToken, isSpotOnly: false }), { exact: true })).toBeVisible();
    await expect(row).toContainText(order.isLong ? "Long" : "Short");
    await expect(row.getByText(orderNames[order.orderType], { exact: true })).toBeVisible();
    await expectTrigger(row, order.orderType, order.isLong, order.triggerPrice, indexToken);
  }
  return { orders: orders.length, rows: single.length + twapGroups.size };
}

async function openOrders(page: Page) {
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Orders/ })
    .click();
}

async function expectRowMatchesChain(
  page: Page,
  row: Locator,
  liveAccounts: LiveAccounts,
  liveAccount: LiveAccount,
  testInfo: TestInfo
) {
  await expect(row).toBeVisible({ timeout: 45_000 });
  const chainId = liveAccounts.chainId;
  const reader = { address: getAddress(getContract(chainId, "SyntheticsReader")), abi: SyntheticsReader } as const;
  const dataStore = getAddress(getContract(chainId, "DataStore"));
  const order = await liveAccounts.rpc.readContract({
    ...reader,
    functionName: "getOrder",
    args: [dataStore, liveAccount.key as Hex],
  });
  expect(getAddress(order.addresses.account), "The order still exists on chain").toBe(liveAccount.account);
  const market = await liveAccounts.rpc.readContract({
    ...reader,
    functionName: "getMarket",
    args: [dataStore, order.addresses.market],
  });
  // Markets list a wrapped index token under its native symbol.
  const indexToken = getToken(chainId, convertTokenAddress(chainId, getAddress(market.indexToken), "native"));
  const indexName = getMarketIndexName({ indexToken, isSpotOnly: false });
  const poolName = getMarketPoolName({
    longToken: getToken(chainId, getAddress(market.longToken)),
    shortToken: getToken(chainId, getAddress(market.shortToken)),
  });
  const { orderType, sizeDeltaUsd } = order.numbers;
  const isLong = order.flags.isLong;
  const isIncrease = orderType === 3;

  await expect(row.locator(`img[alt="${indexToken.symbol}"]`).first()).toBeVisible();
  await expect(row.getByText(indexName, { exact: true })).toBeVisible();
  await expect(row).toContainText(isLong ? "Long" : "Short");
  await expect(row.getByText(orderNames[orderType], { exact: true })).toBeVisible();

  const position = isIncrease
    ? undefined
    : (await liveAccounts.positions(liveAccount.account)).find(
        (p) =>
          getAddress(p.marketAddress) === getAddress(order.addresses.market) &&
          getAddress(p.collateralTokenAddress) === getAddress(order.addresses.initialCollateralToken) &&
          p.isLong === isLong
      );
  const fullClose =
    !isIncrease &&
    (sizeDeltaUsd === maxUint256 ||
      (position !== undefined &&
        (sizeDeltaUsd >= position.sizeInUsd || position.sizeInUsd - sizeDeltaUsd < 10n ** 30n)));
  await expect(row).toContainText(
    fullClose ? "Full position close" : formatUsd(isIncrease ? sizeDeltaUsd : -sizeDeltaUsd, { displayPlus: true })!
  );

  const shown = await expectTrigger(row, orderType, isLong, order.numbers.triggerPrice, indexToken);

  await openTooltip(page, row.getByText(indexName, { exact: true }));
  await expect(page.getByText("Market:", { exact: true }).locator("..")).toContainText(`${indexName}[${poolName}]`);
  await testInfo.attach("live-order-onchain", {
    body: JSON.stringify(
      { key: liveAccount.key, order, market, indexName, poolName, fullClose, shownTrigger: shown },
      (_, v) => (typeof v === "bigint" ? v.toString() : v)
    ),
    contentType: "application/json",
  });
}

test(
  "9.01 22.09 live orders: every pending order is listed with its type, market, side and trigger price, also after refresh",
  { tag: "@avalanche" },
  async ({ page, liveAccount, liveAccounts, liveWallet }, testInfo) => {
    await liveWallet.connect(page);
    await openOrders(page);
    const row = page.getByTestId(`order-${liveAccount.key}`);
    await expect(row).toContainText("Limit", { timeout: 45_000 });
    await expect(row).toContainText(formatUsd(liveAccount.order!.sizeDeltaUsd)!);
    const before = await expectAllOrders(page, liveAccounts, liveAccount.account);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
    await expect(row).toContainText(formatUsd(liveAccount.order!.sizeDeltaUsd)!, { timeout: 45_000 });
    const after = await expectAllOrders(page, liveAccounts, liveAccount.account);
    await testInfo.attach("live-orders-listed", {
      body: JSON.stringify({ before, after }),
      contentType: "application/json",
    });
  }
);

test("17.11 live profile: Orders tab lists the trader's open order as stored on chain", async ({
  page,
  liveAccount,
  liveAccounts,
}, testInfo) => {
  await page.goto(`/traders/${liveAccount.account}`, { waitUntil: "domcontentloaded" });
  const tab = page.getByRole("button", { name: /^Orders\s*\d+$/ });
  await tab.click({ timeout: 45_000 });
  const row = page.getByTestId(`order-${liveAccount.key}`);
  await expectRowMatchesChain(page, row, liveAccounts, liveAccount, testInfo);
  await expect(row.getByRole("button", { name: "Edit order", exact: true })).toHaveCount(0);
  await expect(tab).toHaveText(new RegExp(`^Orders\\s*${await page.locator("[data-qa^='order-']").count()}$`));
  await expect(page.getByTestId("user-address")).toHaveCount(0);
});

for (const { id, profile, kind } of [
  { id: "22.07", profile: "order", kind: "limit" },
  { id: "22.08", profile: "tpsl", kind: "TP/SL" },
] as const) {
  test.describe(kind, () => {
    test.use({ liveProfile: profile });

    test(`${id} live ${kind} order: row matches the on-chain order's market, index token, side, trigger price and size`, async ({
      page,
      liveAccount,
      liveAccounts,
      liveWallet,
    }, testInfo) => {
      await liveWallet.connect(page);
      await openOrders(page);
      await expectRowMatchesChain(
        page,
        page.getByTestId(`order-${liveAccount.key}`),
        liveAccounts,
        liveAccount,
        testInfo
      );
    });
  });
}
