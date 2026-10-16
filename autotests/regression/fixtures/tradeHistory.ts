import type { BrowserContext } from "@playwright/test";
import { getAddress, toHex } from "viem";

import { accountData } from "./accountData";

const FIELDS =
  "srcChainId positionKey positionLifecycleId positionSizeInUsd positionSizeInTokens sizeDeltaInTokens contractTriggerPrice executionAmountOut swapImpactUsd collateralTotalCostAmount priceImpactUsd priceImpactDiffUsd positionFeeAmount traderDiscountAmount borrowingFeeAmount fundingFeeAmount swapFeeUsd uiFeeFactor liquidationFeeAmount minCollateralFactorForLiquidation pnlUsd basePnlUsd twapGroupId numberOfParts totalImpactUsd proportionalPendingImpactUsd reason reasonBytes".split(
    " "
  );

export type TradeActionRow = Record<string, unknown> & { transactionHash: string };

// Defaults alternate an executed market increase (even index) and a profitable market decrease (odd index).
export function tradeAction(
  chainId: number,
  account: string,
  index: number,
  overrides: Record<string, unknown> = {}
): TradeActionRow {
  const { market, collateral } = accountData(chainId, account);
  return {
    ...Object.fromEntries(FIELDS.map((field) => [field, null])),
    id: `regression-trade-${index}`,
    eventName: "OrderExecuted",
    account,
    marketAddress: market.marketTokenAddress,
    swapPath: [],
    initialCollateralTokenAddress: collateral.address,
    initialCollateralDeltaAmount: "250000000",
    sizeDeltaUsd: ((1000n + BigInt(index)) * 10n ** 30n).toString(),
    triggerPrice: "0",
    acceptablePrice: (2500n * 10n ** 12n).toString(),
    executionPrice: (2500n * 10n ** 12n).toString(),
    minOutputAmount: "0",
    collateralTokenPriceMin: (10n ** 24n).toString(),
    collateralTokenPriceMax: (10n ** 24n).toString(),
    indexTokenPriceMin: (2500n * 10n ** 12n).toString(),
    indexTokenPriceMax: (2500n * 10n ** 12n).toString(),
    positionFeeAmount: "600000",
    borrowingFeeAmount: "0",
    fundingFeeAmount: "0",
    priceImpactUsd: "0",
    priceImpactDiffUsd: "0",
    swapImpactUsd: "0",
    swapFeeUsd: "0",
    pnlUsd: (index % 2 ? 10n * 10n ** 30n : 0n).toString(),
    basePnlUsd: (index % 2 ? 10n * 10n ** 30n : 0n).toString(),
    orderType: index % 2 ? 4 : 2,
    orderKey: toHex(index + 1, { size: 32 }),
    isLong: index % 2 === 0,
    shouldUnwrapNativeToken: false,
    decreasePositionSwapType: 0,
    timestamp: Math.floor(Date.now() / 1000) - 60 * index,
    transactionHash: toHex(index + 100, { size: 32 }),
    ...overrides,
  };
}

export async function mockTradeHistory(
  context: BrowserContext,
  chainId: number,
  account: string,
  rows: TradeActionRow[] = Array.from({ length: 51 }, (_, index) => tradeAction(chainId, account, index))
) {
  const requests: { offset: number; limit: number }[] = [];
  await context.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    let body: { query?: string };
    try {
      body = route.request().postDataJSON();
    } catch {
      return route.fallback();
    }
    const query = body?.query;
    const requested = query?.match(/account_eq:\s*"(0x[\da-fA-F]{40})"/);
    if (
      !query?.includes("tradeActions(") ||
      !query.includes("executionPrice") ||
      !requested ||
      getAddress(requested[1]) !== account
    )
      return route.fallback();
    const offset = Number(query.match(/offset:\s*(\d+)/)?.[1] ?? 0);
    const limit = Number(query.match(/limit:\s*(\d+)/)?.[1] ?? 100);
    requests.push({ offset, limit });
    await route.fulfill({
      json: {
        data: { tradeActions: rows.slice(offset, offset + limit), tradeActionsConnection: { totalCount: rows.length } },
      },
    });
  });
  return { rows, requests };
}
