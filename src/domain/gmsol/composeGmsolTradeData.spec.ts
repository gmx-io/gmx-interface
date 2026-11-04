import { describe, expect, it } from "vitest";

import { SOLANA_NETWORK_ID } from "config/chains";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import { GmxApiSdk } from "sdk/clients/v2";
import { mergeMarketsConfigValues } from "sdk/utils/markets";
import type { ApiOrderInfo } from "sdk/utils/orders/types";

import fixturePrices from "./api/__fixtures__/prices.json";
import { createGmsolFixtureHttp } from "./api/createGmsolFixtureHttp";
import { composeGmsolMarkets, getGmsolPositionsConstants } from "./markets/composeGmsolMarkets";
import {
  composeGmsolOrdersInfo,
  getGmsolActiveOrdersInfo,
  getIsGmsolCloseOnlyOrder,
} from "./orders/composeGmsolOrdersInfo";
import { composeGmsolPositionsInfo } from "./positions/composeGmsolPositionsInfo";
import { buildGmsolTokensData } from "./tokens/buildGmsolTokensData";
import { resolveGmsolTokensData } from "./tokens/resolveGmsolTokensData";

const OWNER = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const BTC_MARKET = "7RNev94wKusSmFEqo3gvv1d1zMweP6sa2LtjJjroAvym";

async function loadSamples() {
  const sdk = new GmxApiSdk({ networkId: SOLANA_NETWORK_ID, api: createGmsolFixtureHttp() });
  const [config, values, positions, orders] = await Promise.all([
    sdk.fetchMarketsConfig(),
    sdk.fetchMarketsValues(),
    sdk.fetchPositionsInfo({ address: OWNER }),
    sdk.fetchOrders({ address: OWNER }),
  ]);
  const prices = Object.fromEntries(
    Object.entries(fixturePrices).map(([address, p]) => [
      address,
      { minPrice: BigInt(p.minPrice), maxPrice: BigInt(p.maxPrice) },
    ])
  );

  return { raw: mergeMarketsConfigValues(config, values), positions, orders, tokensData: buildGmsolTokensData(prices) };
}

describe("Solana trade state from the gmx-api samples", () => {
  it("fills markets, positions and orders keyed by base58 addresses", async () => {
    const { raw, positions, orders, tokensData } = await loadSamples();

    const { marketsInfoData, marketsAddresses } = composeGmsolMarkets(raw, tokensData);
    const positionsInfoData = composeGmsolPositionsInfo(positions, marketsInfoData, { showPnlInLeverage: false });
    const ordersInfoData = composeGmsolOrdersInfo(orders, { marketsInfoData, tokensData });

    expect(marketsAddresses).toHaveLength(4);
    expect(marketsInfoData[BTC_MARKET].indexToken.symbol).toBe("BTC");
    expect(marketsInfoData[BTC_MARKET].longToken.symbol).toBe("WBTC");
    expect(getGmsolPositionsConstants(raw)?.minCollateralUsd).toBe(10n ** 30n);

    const [position] = Object.values(positionsInfoData);
    expect(position.key).toBe(`${OWNER}:${BTC_MARKET}:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:false`);
    expect(position.collateralToken.symbol).toBe("USDC");

    expect(Object.keys(ordersInfoData)).toHaveLength(orders.length);
  });

  it("keeps a missing ticker's last price only within the cache TTL", async () => {
    const { raw, tokensData } = await loadSamples();
    const btcAddress = raw[BTC_MARKET].indexTokenAddress;
    const withoutBtc = { ...tokensData };
    delete withoutBtc[btcAddress];

    const complete = resolveGmsolTokensData({
      tokensData,
      receivedAt: 0,
      rawMarketsInfoData: raw,
      lastComplete: undefined,
    });
    const withinTtl = resolveGmsolTokensData({
      tokensData: withoutBtc,
      receivedAt: PRICES_CACHE_TTL - 1,
      rawMarketsInfoData: raw,
      lastComplete: complete.lastComplete,
    });
    const pastTtl = resolveGmsolTokensData({
      tokensData: withoutBtc,
      receivedAt: PRICES_CACHE_TTL,
      rawMarketsInfoData: raw,
      lastComplete: complete.lastComplete,
    });

    expect(complete.tokensData).toBe(tokensData);
    expect(withinTtl.tokensData?.[btcAddress]).toBe(tokensData[btcAddress]);
    expect(withinTtl.pricesUpdatedAt).toBe(0);
    expect(pastTtl.tokensData).toBeUndefined();
  });

  it.each`
    actionState    | closeOnly
    ${"pending"}   | ${false}
    ${undefined}   | ${false}
    ${"completed"} | ${true}
    ${"cancelled"} | ${true}
  `("makes an order with actionState $actionState close-only: $closeOnly", async ({ actionState, closeOnly }) => {
    const { raw, orders, tokensData } = await loadSamples();
    const { marketsInfoData } = composeGmsolMarkets(raw, tokensData);
    const sample = { ...orders[0], actionState } as ApiOrderInfo;

    const ordersInfoData = composeGmsolOrdersInfo([sample], { marketsInfoData, tokensData });
    const [order] = Object.values(ordersInfoData);

    expect(getIsGmsolCloseOnlyOrder(order)).toBe(closeOnly);
    expect(Object.keys(getGmsolActiveOrdersInfo(ordersInfoData))).toHaveLength(closeOnly ? 0 : 1);
  });
});
